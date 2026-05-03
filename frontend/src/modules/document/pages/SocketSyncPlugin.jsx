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
    if (initialContent !== null) {
      editor.update(() => {
        const parser = new DOMParser();
        const dom = parser.parseFromString(initialContent, 'text/html');
        const nodes = $generateNodesFromDOM(editor, dom);
        const root = $getRoot();
        root.clear();
        root.append(...nodes);
        lastContentRef.current = initialContent;
        hasInitializedRef.current = true;
      });
    }
  }, [editor, initialContent]);

  useEffect(() => {
    if (!socket || !editor || !docId) return;

    // 📥 RECEIVE CHANGES FROM SOCKET
    const handleRemoteUpdate = (htmlContent) => {
      if (isUpdatingRef.current) return;
      if (htmlContent === lastContentRef.current) return;

      isUpdatingRef.current = true;
      lastContentRef.current = htmlContent;

      editor.update(() => {
        try {
          const parser = new DOMParser();
          const dom = parser.parseFromString(htmlContent, 'text/html');
          const nodes = $generateNodesFromDOM(editor, dom);
          
          const root = $getRoot();
          root.clear();
          root.append(...nodes);
        } catch (err) {
          console.error('Remote sync error:', err);
        } finally {
          setTimeout(() => {
            isUpdatingRef.current = false;
          }, 50);
        }
      });
    };

    // We no longer need load-document here because it's handled above
    socket.on('receive-changes', handleRemoteUpdate);

    // 📤 SEND CHANGES TO SOCKET
    const removeUpdateListener = editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves }) => {
      if (isUpdatingRef.current) return;
      if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;

      editorState.read(() => {
        const html = $generateHtmlFromNodes(editor, null);
        if (html === lastContentRef.current) return;
        
        lastContentRef.current = html;
        socket.emit('send-changes', html);

        onSyncStatusChange(true);
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        
        saveTimeoutRef.current = setTimeout(() => {
          socket.emit('save-document', html);
          onSyncStatusChange(false);
        }, 2000);
      });
    });

    return () => {
      socket.off('receive-changes', handleRemoteUpdate);
      removeUpdateListener();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [socket, editor, docId, onSyncStatusChange]);

  return null;
}
