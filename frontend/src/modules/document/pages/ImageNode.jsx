import { DecoratorNode, createCommand, $getNodeByKey } from 'lexical';
import React from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

export const INSERT_IMAGE_COMMAND = createCommand();

/**
 * 🎨 Premium Collaborative Resizable Image Component
 * Renders sleek dimensions tooltips and interactive drag handles.
 * Seamlessly commits new dimensions to the Lexical schema to trigger real-time multi-tab socket synchronization!
 */
function ResizableImage({ src, altText, nodeKey, width, height }) {
  const [editor] = useLexicalComposerContext();
  const [isHovered, setIsHovered] = React.useState(false);
  const [isResizing, setIsResizing] = React.useState(false);
  
  const [localWidth, setLocalWidth] = React.useState(width || 'inherit');
  const [localHeight, setLocalHeight] = React.useState(height || 'inherit');

  const imageRef = React.useRef(null);
  const currentSizeRef = React.useRef({ width: localWidth, height: localHeight });

  React.useEffect(() => {
    setLocalWidth(width || 'inherit');
    setLocalHeight(height || 'inherit');
    currentSizeRef.current = { width: width || 'inherit', height: height || 'inherit' };
  }, [width, height]);

  const onMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;

    const imgElement = imageRef.current;
    if (!imgElement) return;

    const startWidth = imgElement.clientWidth;
    const startHeight = imgElement.clientHeight;

    setIsResizing(true);

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const newWidth = Math.max(100, startWidth + deltaX);
      const newHeight = Math.max(100, startHeight + deltaY);

      const wStr = `${newWidth}px`;
      const hStr = `${newHeight}px`;

      setLocalWidth(wStr);
      setLocalHeight(hStr);
      currentSizeRef.current = { width: wStr, height: hStr };

      // 🌀 SRE DRAG-TO-SCROLL ENGINE: Auto-scroll the editor window if dragging near the viewport boundaries
      const scrollContainer = imgElement.closest('.lexical-editor-content');
      if (scrollContainer) {
        const rect = scrollContainer.getBoundingClientRect();
        const bottomThreshold = rect.bottom - 50; // 50px boundary from bottom
        const topThreshold = rect.top + 50;    // 50px boundary from top

        if (moveEvent.clientY > bottomThreshold) {
          scrollContainer.scrollTop += 12; // Auto-scroll down smoothly
        } else if (moveEvent.clientY < topThreshold) {
          scrollContainer.scrollTop -= 12; // Auto-scroll up smoothly
        }
      }
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      const finalSize = currentSizeRef.current;
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if (node && typeof node.setWidth === 'function') {
          node.setWidth(finalSize.width);
          node.setHeight(finalSize.height);
        }
      });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const isUploading = src.startsWith('blob:') || src.startsWith('data:');

  return (
    <span
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        display: 'inline-block',
        maxWidth: '100%',
        margin: '8px 0',
        borderRadius: '8px',
        padding: '2px',
        transition: 'all 0.2s ease',
        boxShadow: isResizing || isHovered 
          ? '0 0 0 2px var(--accent-color, #3b82f6), 0 8px 24px rgba(59, 130, 246, 0.15)' 
          : '0 0 0 1px rgba(255, 255, 255, 0.05)',
        cursor: 'default',
        backgroundColor: 'rgba(255, 255, 255, 0.02)'
      }}
    >
      <img
        ref={imageRef}
        src={src}
        alt={altText}
        className={`editor-image ${isUploading ? 'uploading-image' : ''}`}
        style={{
          width: localWidth,
          height: localHeight,
          display: 'block',
          maxWidth: '100%',
          borderRadius: '6px',
          opacity: isUploading ? 0.6 : 1,
          filter: isUploading ? 'blur(2px)' : 'none',
          transition: 'opacity 0.3s ease, filter 0.3s ease',
          pointerEvents: 'none', // Block native browser drag interference
          userSelect: 'none'
        }}
      />
      
      {/* 📐 Live Dimensions Floating Badge */}
      {isResizing && (
        <div style={{
          position: 'absolute',
          top: '-36px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          color: '#fff',
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '11px',
          fontFamily: 'Inter, sans-serif',
          fontWeight: '600',
          pointerEvents: 'none',
          zIndex: 100,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          whiteSpace: 'nowrap'
        }}>
          {imageRef.current ? `${imageRef.current.clientWidth}px × ${imageRef.current.clientHeight}px` : `${localWidth} × ${localHeight}`}
        </div>
      )}

      {/* 🚀 Sleek Resize Handle */}
      {!isUploading && (isHovered || isResizing) && (
        <div
          onMouseDown={onMouseDown}
          style={{
            position: 'absolute',
            bottom: '-4px',
            right: '-4px',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-color, #3b82f6)',
            border: '2.5px solid #fff',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
            cursor: 'nwse-resize',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.15s ease',
            transform: 'scale(1.2)'
          }}
          title="Drag to resize image"
        />
      )}

      {isUploading && (
        <span className="image-upload-spinner" style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 0, 0, 0.75)',
          color: '#fff',
          padding: '6px 12px',
          borderRadius: '12px',
          fontSize: '11px',
          fontFamily: 'Inter, sans-serif',
          pointerEvents: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontWeight: '500',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
        }}>
          <svg className="spinning" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ animation: 'spin 1s linear infinite' }}>
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Uploading...
        </span>
      )}
    </span>
  );
}

export class ImageNode extends DecoratorNode {
  __src;
  __altText;
  __width;
  __height;

  static getType() {
    return 'image';
  }

  static clone(node) {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__width,
      node.__height,
      node.__key
    );
  }

  static importJSON(serializedNode) {
    const { src, altText, width, height } = serializedNode;
    const node = $createImageNode({
      src,
      altText,
      width,
      height,
    });
    return node;
  }

  constructor(src = '', altText = '', width = 'inherit', height = 'inherit', key) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__width = width;
    this.__height = height;
  }

  exportJSON() {
    return {
      type: 'image',
      src: this.__src,
      altText: this.__altText,
      width: this.__width,
      height: this.__height,
      version: 1,
    };
  }

  createDOM(config) {
    const span = document.createElement('span');
    const theme = config.theme;
    const className = theme.image;
    if (className !== undefined) {
      span.className = className;
    }
    return span;
  }

  updateDOM() {
    return false;
  }

  getSrc() {
    return this.__src;
  }

  getAltText() {
    return this.__altText;
  }

  getWidth() {
    return this.__width;
  }

  getHeight() {
    return this.__height;
  }

  setSrc(src) {
    const self = this.getWritable();
    self.__src = src;
  }

  setWidth(width) {
    const self = this.getWritable();
    self.__width = width;
  }

  setHeight(height) {
    const self = this.getWritable();
    self.__height = height;
  }

  decorate() {
    return (
      <ResizableImage
        src={this.__src}
        alt={this.__altText}
        nodeKey={this.__key}
        width={this.__width}
        height={this.__height}
      />
    );
  }
}

export function $createImageNode({ src, altText, width, height }) {
  return new ImageNode(src, altText, width, height);
}

export function $isImageNode(node) {
  return node instanceof ImageNode;
}
