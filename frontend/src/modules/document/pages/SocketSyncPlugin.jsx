import { useEffect, useRef, useCallback } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot } from 'lexical';
import { $generateNodesFromDOM } from '@lexical/html';

/**
 * @component SocketSyncPlugin
 * @description Bridges Lexical editor state with the existing Socket.io logic.
 * Handles 'send-changes', 'receive-changes', and 'save-document' without backend changes.
 */
export default function SocketSyncPlugin({ socket, docId, initialContent, isOnline, onSyncStatusChange }) {
  const [editor] = useLexicalComposerContext();
  const isUpdatingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const saveTimeoutRef = useRef(null);
  const lastContentRef = useRef(null);
  const pendingStateRef = useRef(null);

  // 🚀 Helper to flush any pending save to the DB
  const flushSave = useCallback(() => {
    if (pendingStateRef.current && socket && isOnline) {
      const stateString = typeof pendingStateRef.current === 'string' 
        ? pendingStateRef.current 
        : JSON.stringify(pendingStateRef.current);
        
      socket.emit('save-document', stateString);
      pendingStateRef.current = null;
      onSyncStatusChange(false);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    }
  }, [socket, isOnline, onSyncStatusChange]);

  useEffect(() => {
    if (!editor || hasInitializedRef.current) return;

    if (initialContent !== null && initialContent !== undefined) {
      try {
        const contentToParse = typeof initialContent === 'string' && initialContent.startsWith('{')
          ? JSON.parse(initialContent) 
          : initialContent;
          
        const parsedState = editor.parseEditorState(contentToParse);
        editor.setEditorState(parsedState);
        lastContentRef.current = JSON.stringify(parsedState.toJSON());
      } catch (e) {
        // Fallback to HTML
        editor.update(() => {
          const parser = new DOMParser();
          const dom = parser.parseFromString(initialContent, 'text/html');
          const nodes = $generateNodesFromDOM(editor, dom);
          const root = $getRoot();
          root.clear();
          root.append(...nodes);
        });
        lastContentRef.current = initialContent;
      }
      hasInitializedRef.current = true;
    }
  }, [editor, initialContent]);

  useEffect(() => {
    if (!socket || !editor || !docId) return;

    // 📥 RECEIVE CHANGES FROM SOCKET
    const handleRemoteUpdate = (stateJSON) => {
      if (isUpdatingRef.current) return;
      
      const stateString = JSON.stringify(stateJSON);
      if (stateString === lastContentRef.current) return;

      isUpdatingRef.current = true;
      lastContentRef.current = stateString;

      try {
        const parsedState = editor.parseEditorState(stateJSON);
        editor.setEditorState(parsedState, { tag: 'remote' });
      } catch (err) {
        console.error('Remote sync error:', err);
      } finally {
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 100);
      }
    };

    socket.on('receive-changes', handleRemoteUpdate);

    // 📤 SEND CHANGES TO SOCKET
    const removeUpdateListener = editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves, tags }) => {
      if (isUpdatingRef.current || tags.has('remote')) return;
      if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;

      const stateJSON = editorState.toJSON();
      const stateString = JSON.stringify(stateJSON);
      
      if (stateString === lastContentRef.current) return;
      
      lastContentRef.current = stateString;
      pendingStateRef.current = stateJSON;
      
      // 🚀 Broadcast to others immediately
      socket.emit('send-changes', stateJSON);

      onSyncStatusChange(true);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      
      saveTimeoutRef.current = setTimeout(flushSave, 2000);
    });

    // 🚀 Handle window close / tab switch
    const handleBeforeUnload = () => flushSave();
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      socket.off('receive-changes', handleRemoteUpdate);
      removeUpdateListener();
      flushSave(); // 🚀 Force save on unmount
    };
  }, [socket, editor, docId, onSyncStatusChange, isOnline, flushSave]);

  return null;
}

