import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { $getRoot, $insertNodes } from 'lexical';

/**
 * @component SocketSyncPlugin
 * @description Bridges Lexical editor state with the existing Socket.io logic.
 * Handles 'send-changes', 'receive-changes', and 'save-document' without backend changes.
 */
export default function SocketSyncPlugin({ socket, docId, initialContent, isOnline, onSyncStatusChange }) {
  const [editor] = useLexicalComposerContext();
  const isUpdatingRef = useRef(false);
  const hasInitializedRef = useRef(false); // 🚀 Ensure we only load initial content once
  const saveTimeoutRef = useRef(null);
  const lastContentRef = useRef('');

  useEffect(() => {
    if (!editor || hasInitializedRef.current) return;

    // 🚀 INITIAL LOAD: If we have content from the server, push it in now
    if (initialContent !== null && initialContent !== '') {
      try {
        // Try to parse if it's a string, or use as is if it's already an object
        const contentToParse = typeof initialContent === 'string' 
          ? JSON.parse(initialContent) 
          : initialContent;
          
        const parsedState = editor.parseEditorState(contentToParse);
        editor.setEditorState(parsedState);
      } catch (e) {
        // Fallback to HTML (Legacy Support)
        editor.update(() => {
          const parser = new DOMParser();
          const dom = parser.parseFromString(initialContent, 'text/html');
          const nodes = $generateNodesFromDOM(editor, dom);
          const root = $getRoot();
          root.clear();
          root.append(...nodes);
        });
      }
      lastContentRef.current = initialContent;
      hasInitializedRef.current = true;
    } else if (initialContent === '') {
      hasInitializedRef.current = true; // Empty doc is initialized
    }
  }, [editor, initialContent]);

  useEffect(() => {
    if (!socket || !editor || !docId) return;

    // 📥 RECEIVE CHANGES FROM SOCKET
    const handleRemoteUpdate = (stateJSON) => {
      if (isUpdatingRef.current) return;
      
      const stateString = JSON.stringify(stateJSON);
      if (stateString === JSON.stringify(lastContentRef.current)) return;

      isUpdatingRef.current = true;
      lastContentRef.current = stateJSON;

      try {
        const parsedState = editor.parseEditorState(stateJSON);
        // 🚀 Use a 'remote' tag to prevent the update listener from sending this back
        editor.setEditorState(parsedState, { tag: 'remote' });
      } catch (err) {
        console.error('Remote sync error:', err);
      } finally {
        // Small buffer to ensure HMR or rapid typing doesn't break the lock
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 100);
      }
    };

    // We no longer need load-document here because it's handled above
    socket.on('receive-changes', handleRemoteUpdate);

    // 📤 SEND CHANGES TO SOCKET
    const removeUpdateListener = editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves, tags }) => {
      // 🚀 CRITICAL: If this update came from the socket (tagged 'remote'), do NOT send it back
      if (isUpdatingRef.current || tags.has('remote')) return;
      if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;

      const stateJSON = editorState.toJSON();
      const stateString = JSON.stringify(stateJSON);
      
      if (stateString === JSON.stringify(lastContentRef.current)) return;
      
      lastContentRef.current = stateJSON;
      socket.emit('send-changes', stateJSON);

      onSyncStatusChange(true);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      
      saveTimeoutRef.current = setTimeout(() => {
        // 🚀 Save JSON string to DB for 100% precision on refresh
        socket.emit('save-document', stateString);
        onSyncStatusChange(false);
      }, 2000);
    });

    return () => {
      socket.off('receive-changes', handleRemoteUpdate);
      removeUpdateListener();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [socket, editor, docId, onSyncStatusChange]);

  return null;
}
