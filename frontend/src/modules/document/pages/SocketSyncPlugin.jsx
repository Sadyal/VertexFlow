import { useEffect, useRef, useCallback } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, SELECTION_CHANGE_COMMAND, $getSelection, $isRangeSelection, COMMAND_PRIORITY_EDITOR } from 'lexical';
import { $generateNodesFromDOM } from '@lexical/html';
import { db } from '../../../utils/db';

/**
 * 🚀 SRE Conflict-Free Block-Level Merging Engine
 * Prevents concurrent edit overwrites when multiple users modify different paragraphs.
 */
/**
 * Helper to extract keys from a Lexical state JSON object
 */
function getKeysFromJSON(json) {
  const keys = new Set();
  if (json?.root?.children) {
    for (const child of json.root.children) {
      if (child.key) {
        keys.add(child.key);
      }
    }
  }
  return keys;
}

/**
 * 🚀 SRE Conflict-Free Key-Based Paragraph Merging Engine
 * Prevents paragraph duplication and order swapping by doing structural key-based merging.
 * Uses lastAuthoritativeState (lastContentRef) to differentiate between local additions and remote deletions.
 */
function mergeLexicalStates(localJSON, remoteJSON, localActiveBlockKey, isLocalTyping, syncedKeys) {
  if (!localJSON?.root?.children || !remoteJSON?.root?.children) {
    return remoteJSON; // Fallback to remote authoritative copy if malformed
  }

  const localChildren = localJSON.root.children;
  const remoteChildren = remoteJSON.root.children;

  const localMap = new Map(localChildren.map(node => [node.key, node]));
  const remoteKeys = new Set(remoteChildren.map(node => node.key));

  // Step 1: Initialize merged list based on remote children as the source of truth
  const mergedChildren = [];
  for (const remoteNode of remoteChildren) {
    const localNode = localMap.get(remoteNode.key);
    if (localNode && isLocalTyping && remoteNode.key === localActiveBlockKey) {
      // Keep local active node to preserve active typing state
      mergedChildren.push(localNode);
    } else {
      // Accept remote authoritative updates
      mergedChildren.push(remoteNode);
    }
  }

  // Step 2: Traverse local nodes in order, inserting local-only additions at their relative index
  let lastInsertedIndex = -1;
  for (let i = 0; i < localChildren.length; i++) {
    const localNode = localChildren[i];
    if (!remoteKeys.has(localNode.key)) {
      // Determine if this is a genuine new local addition or a deleted remote node
      const isNewLocalNode = !syncedKeys.has(localNode.key);
      const isActiveTypingNode = isLocalTyping && localNode.key === localActiveBlockKey;

      if (isNewLocalNode || isActiveTypingNode) {
        // Find the predecessor in localChildren that is also in remoteKeys
        let predecessorKey = null;
        for (let j = i - 1; j >= 0; j--) {
          if (remoteKeys.has(localChildren[j].key)) {
            predecessorKey = localChildren[j].key;
            break;
          }
        }

        let insertIndex = 0;
        if (predecessorKey !== null) {
          const predIdx = mergedChildren.findIndex(n => n.key === predecessorKey);
          if (predIdx !== -1) {
            insertIndex = predIdx + 1;
          }
        } else {
          // If no predecessor, insert after the last inserted index
          insertIndex = Math.max(0, lastInsertedIndex + 1);
        }

        mergedChildren.splice(insertIndex, 0, localNode);
        lastInsertedIndex = insertIndex;
      }
    } else {
      // Track index of current successfully mapped node in mergedChildren
      const idx = mergedChildren.findIndex(n => n.key === localNode.key);
      if (idx !== -1) {
        lastInsertedIndex = idx;
      }
    }
  }

  return {
    ...localJSON,
    root: {
      ...localJSON.root,
      children: mergedChildren
    }
  };
}

/**
 * @component SocketSyncPlugin
 * @description Bridges Lexical editor state with the existing Socket.io logic.
 * Handles 'send-changes', 'receive-changes', and 'save-document' without backend changes.
 */
export default function SocketSyncPlugin({ 
  socket, 
  docId, 
  initialContent, 
  isOnline, 
  userId, 
  userName, 
  userAvatar, 
  onSyncStatusChange,
  onCollaboratorsChange 
}) {
  const [editor] = useLexicalComposerContext();
  const isUpdatingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const saveTimeoutRef = useRef(null);
  const lastContentRef = useRef(null);
  const pendingStateRef = useRef(null);
  
  // Track currently selected local block node key
  const localActiveBlockKeyRef = useRef(null);

  // 🚀 SRE CLIENT-SIDE BROADCAST THROTTLING (Bypasses server rate limit drops)
  const broadcastTimeoutRef = useRef(null);
  const lastEmitTimeRef = useRef(0);

  // 🚀 SRE PRESENCE & AWARENESS REFS
  const lastMouseEmitTimeRef = useRef(0);
  const lastSelectionEmitTimeRef = useRef(0);
  const lastCursorRef = useRef(null);
  const idleTimeoutRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isLocalTypingRef = useRef(false);
  const localStatusRef = useRef('online');

  // Helper to update local typing state and notify other users
  const updateLocalTyping = useCallback((isTyping) => {
    if (isLocalTypingRef.current === isTyping) return;
    isLocalTypingRef.current = isTyping;
    if (socket && socket.connected) {
      socket.emit('presence-update', { status: localStatusRef.current, isTyping });
    }
  }, [socket]);

  // 🚀 Helper to flush any pending save to the DB
  const flushSave = useCallback(() => {
    if (pendingStateRef.current && socket && socket.connected) {
      const stateString = typeof pendingStateRef.current === 'string' 
        ? pendingStateRef.current 
        : JSON.stringify(pendingStateRef.current);
        
      socket.emit('save-document', stateString);
      // 🛡️ SRE DB SAVE INTEGRITY: Keep pendingSave as true until server database save is fully confirmed!
      db.saveDocument(docId, stateString, userId, true); 
      
      pendingStateRef.current = null;
      onSyncStatusChange(false);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    }
  }, [socket, onSyncStatusChange, docId, userId]);

  useEffect(() => {
    if (!editor || initialContent === null || initialContent === undefined) return;

    const contentString = typeof initialContent === 'string' ? initialContent : JSON.stringify(initialContent);
    
    const initializeSync = async () => {
      const record = await db.getDocumentRecord(docId, userId);
      const hasUnsavedChanges = record?.pendingSave === true;

      // 🚀 If already initialized, only update if the content is actually different (Server vs Cache)
      if (hasInitializedRef.current) {
        if (hasUnsavedChanges) {
          // Push local cache changes to server instead of letting server overwrite us!
          if (socket && socket.connected) {
            socket.emit('save-document', contentString);
            try {
              const contentObj = typeof initialContent === 'string' ? JSON.parse(initialContent) : initialContent;
              socket.emit('send-changes', contentObj);
            } catch (e) {
              // Ignore parse errors
            }
          }
          return;
        }

        if (contentString === lastContentRef.current) return;
        
        // If server version is different, we must update to ensure integrity
        isUpdatingRef.current = true;
        try {
          const contentToParse = contentString.startsWith('{') ? JSON.parse(contentString) : contentString;
          const parsedState = editor.parseEditorState(contentToParse);
          editor.setEditorState(parsedState);
          lastContentRef.current = contentString;
        } finally {
          setTimeout(() => { isUpdatingRef.current = false; }, 100);
        }
        return;
      }

      // First time initialization (usually from Cache)
      isUpdatingRef.current = true;
      try {
        const contentToParse = contentString.startsWith('{') ? JSON.parse(contentString) : contentString;
        const parsedState = editor.parseEditorState(contentToParse);
        editor.setEditorState(parsedState);
        lastContentRef.current = contentString;
        hasInitializedRef.current = true;

        if (hasUnsavedChanges && socket && socket.connected) {
          socket.emit('save-document', contentString);
          socket.emit('send-changes', contentToParse);
        }
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
        lastContentRef.current = contentString;
        hasInitializedRef.current = true;
      } finally {
        setTimeout(() => { isUpdatingRef.current = false; }, 100);
      }
    };

    initializeSync();
  }, [editor, initialContent, docId, userId, socket]);

  useEffect(() => {
    if (!socket || !editor || !docId) return;

    // 🚀 Handle DB persist confirmation from the server
    const handleSaveConfirmed = ({ docId: confirmedDocId, updatedAt }) => {
      if (confirmedDocId === docId && lastContentRef.current) {
        // Clear pendingSave flag and save new server updatedAt timestamp!
        db.saveDocument(docId, lastContentRef.current, userId, false, updatedAt); 
      }
    };

    socket.on('save-confirmed', handleSaveConfirmed);

    // 📥 RECEIVE CHANGES FROM SOCKET (With Paragraph Conflict-Free Merging)
    const handleRemoteUpdate = (stateJSON) => {
      if (isUpdatingRef.current) return;
      
      console.log(`[CLIENT RECEIVE] Socket: ${socket.id} | Doc: ${docId} | Received remote changes.`);

      const stateString = JSON.stringify(stateJSON);
      if (stateString === lastContentRef.current) return;

      isUpdatingRef.current = true;
      lastContentRef.current = stateString;

      try {
        const localJSON = editor.getEditorState().toJSON();
        
        // Parse last successfully synced content to determine which keys already existed
        let syncedKeys = new Set();
        if (lastContentRef.current) {
          try {
            const parsed = typeof lastContentRef.current === 'string'
              ? JSON.parse(lastContentRef.current)
              : lastContentRef.current;
            if (parsed?.root?.children) {
              for (const child of parsed.root.children) {
                if (child.key) syncedKeys.add(child.key);
              }
            }
          } catch (e) {
            console.error('Failed to extract syncedKeys:', e);
          }
        }

        const mergedJSON = mergeLexicalStates(
          localJSON, 
          stateJSON, 
          localActiveBlockKeyRef.current, 
          isLocalTypingRef.current,
          syncedKeys
        );
        const parsedState = editor.parseEditorState(mergedJSON);
        
        editor.setEditorState(parsedState, { tag: 'remote' });
        db.saveDocument(docId, JSON.stringify(mergedJSON), userId); // 🚀 Update cache on remote change
      } catch (err) {
        console.error('Remote sync error:', err);
      } finally {
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 100);
      }
    };

    socket.on('receive-changes', handleRemoteUpdate);

    // 📤 SELECTION AND BLOCK TRACKER AWARENESS LISTENER
    const removeSelectionListener = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        editor.getEditorState().read(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const anchor = selection.anchor;
            let blockNode = anchor.getNode();
            while (blockNode && blockNode.getParent() && blockNode.getParent().getType() !== 'root') {
              blockNode = blockNode.getParent();
            }
            if (blockNode) {
              const blockKey = blockNode.getKey();
              const blockType = blockNode.getType();
              
              localActiveBlockKeyRef.current = blockKey; // Keep track of current selected block node locally

              const now = Date.now();
              if (now - lastSelectionEmitTimeRef.current >= 100) {
                lastSelectionEmitTimeRef.current = now;
                socket.emit('presence-update', {
                  status: localStatusRef.current,
                  isTyping: isLocalTypingRef.current,
                  cursor: lastCursorRef.current,
                  activeBlock: { key: blockKey, type: blockType }
                });
              }
            }
          }
        });
        return false;
      },
      COMMAND_PRIORITY_EDITOR
    );

    // 📤 SEND CHANGES TO SOCKET (With 75ms SRE Throttling ceiling)
    const removeUpdateListener = editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves, tags }) => {
      if (isUpdatingRef.current || tags.has('remote')) return;
      if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;

      const stateJSON = editorState.toJSON();
      const stateString = JSON.stringify(stateJSON);
      
      if (stateString === lastContentRef.current) return;
      
      lastContentRef.current = stateString;
      pendingStateRef.current = stateJSON;

      const performEmit = () => {
        if (socket && socket.connected) {
          console.log(`[CLIENT SEND] Socket: ${socket.id} | Doc: ${docId} | Sending changes...`);
          socket.emit('send-changes', stateJSON);
        }
        lastEmitTimeRef.current = Date.now();
      };

      // 🛡️ SRE CLIENT-SIDE CEILING: Throttle websocket emissions to 75ms to bypass the 50ms rate limit
      const now = Date.now();
      const timeSinceLastEmit = now - lastEmitTimeRef.current;

      if (broadcastTimeoutRef.current) {
        clearTimeout(broadcastTimeoutRef.current);
      }

      if (timeSinceLastEmit >= 75) {
        performEmit();
      } else {
        broadcastTimeoutRef.current = setTimeout(performEmit, 75 - timeSinceLastEmit);
      }

      // Live Typing Status Notification
      updateLocalTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        updateLocalTyping(false);
      }, 3000); // Stop typing status after 3 seconds of pause

      db.saveDocument(docId, stateString, userId, true); // 🚀 Cache local edits instantly as pendingSave

      onSyncStatusChange(true);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      
      saveTimeoutRef.current = setTimeout(flushSave, 2000);
    });

    // 🛡️ SRE PRESENCE SELF-HEALING: Automatically re-emit presence/selection details when socket reconnects!
    // Added a 150ms delay to resolve the handshake race condition where presence-update is processed before get-document room join.
    const handleConnect = () => {
      setTimeout(() => {
        if (!socket || !socket.connected) return;
        editor.getEditorState().read(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const anchor = selection.anchor;
            let blockNode = anchor.getNode();
            while (blockNode && blockNode.getParent() && blockNode.getParent().getType() !== 'root') {
              blockNode = blockNode.getParent();
            }
            if (blockNode) {
              socket.emit('presence-update', {
                status: localStatusRef.current,
                isTyping: isLocalTypingRef.current,
                cursor: lastCursorRef.current,
                activeBlock: { key: blockNode.getKey(), type: blockNode.getType() }
              });
              return;
            }
          }
          socket.emit('presence-update', {
            status: localStatusRef.current,
            isTyping: isLocalTypingRef.current,
            cursor: lastCursorRef.current
          });
        });
      }, 500);
    };

    socket.on('connect', handleConnect);

    // 🛡️ SRE PRESENCE SELF-HEALING: If socket is already connected (due to skeleton lazy loading race),
    // manually trigger handleConnect immediately to publish initial online presence state!
    if (socket.connected) {
      handleConnect();
    }

    // 🚀 Handle window close / tab switch
    const handleBeforeUnload = () => {
      // Allow normal page refreshes without triggering forced redirects on reload
      flushSave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      socket.off('receive-changes', handleRemoteUpdate);
      socket.off('save-confirmed', handleSaveConfirmed);
      socket.off('connect', handleConnect);

      removeUpdateListener();
      removeSelectionListener();
      if (broadcastTimeoutRef.current) clearTimeout(broadcastTimeoutRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      // 🚀 Explicitly notify collaborators that typing has stopped and presence is disconnected
      if (socket && socket.connected) {
        socket.emit('presence-update', { status: 'offline', isTyping: false });
      }
      
      flushSave(); // 🚀 Force save on unmount
    };
  }, [socket, editor, docId, onSyncStatusChange, flushSave, userId, onCollaboratorsChange, updateLocalTyping]);

  // 👁️ SRE MOUSE CURSOR & IDLE EVENT WORKER (Granular 80ms mouse movement throttle)
  useEffect(() => {
    if (!socket || !editor || !docId) return;

    const editorElement = editor.getRootElement();
    if (!editorElement) return;

    const resetIdleTimeout = () => {
      if (localStatusRef.current !== 'online') {
        localStatusRef.current = 'online';
        socket.emit('presence-update', { status: 'online', isTyping: isLocalTypingRef.current });
      }
      
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      
      idleTimeoutRef.current = setTimeout(() => {
        localStatusRef.current = 'idle';
        socket.emit('presence-update', { status: 'idle', isTyping: false });
      }, 300000); // 5 minutes -> Idle Status
    };

    const handleMouseMove = (e) => {
      resetIdleTimeout();

      const now = Date.now();
      if (now - lastMouseEmitTimeRef.current < 80) return; // 🛡️ Throttle mouse writes to 80ms to avoid cursor packet storms!
      lastMouseEmitTimeRef.current = now;

      const rect = editorElement.getBoundingClientRect();
      if (!rect) return;

      // Percentage-based X, scroll-inclusive relative Y for precise cross-viewport rendering!
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = e.clientY - rect.top + window.scrollY;

      lastCursorRef.current = { x, y };

      socket.emit('presence-update', {
        status: localStatusRef.current,
        isTyping: isLocalTypingRef.current,
        cursor: { x, y }
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        localStatusRef.current = 'online';
        socket.emit('presence-update', { status: 'online', isTyping: isLocalTypingRef.current });
        resetIdleTimeout();
      } else {
        localStatusRef.current = 'idle';
        socket.emit('presence-update', { status: 'idle', isTyping: false });
      }
    };

    const handleFocus = () => {
      localStatusRef.current = 'online';
      socket.emit('presence-update', { status: 'online', isTyping: isLocalTypingRef.current });
      resetIdleTimeout();
    };

    const handleBlur = () => {
      localStatusRef.current = 'idle';
      socket.emit('presence-update', { status: 'idle', isTyping: false });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', resetIdleTimeout);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    resetIdleTimeout();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', resetIdleTimeout);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
  }, [socket, editor, docId]);

  return null;
}
