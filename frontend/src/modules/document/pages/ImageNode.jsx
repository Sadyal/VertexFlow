import { DecoratorNode, createCommand } from 'lexical';
import React from 'react';

export const INSERT_IMAGE_COMMAND = createCommand();

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

  // 🚀 MANDATORY: Must return a node instance from serialized data
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

  // 🚀 MANDATORY: Constructor must handle optional/empty arguments
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

  setSrc(src) {
    const self = this.getWritable();
    self.__src = src;
  }

  decorate() {
    const isUploading = this.__src.startsWith('blob:') || this.__src.startsWith('data:');
    return (
      <span className="editor-image-container" style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
        <img
          src={this.__src}
          alt={this.__altText}
          className={`editor-image ${isUploading ? 'uploading-image' : ''}`}
          style={{
            width: this.__width,
            height: this.__height,
            display: 'block',
            maxWidth: '100%',
            opacity: isUploading ? 0.6 : 1,
            filter: isUploading ? 'blur(2px)' : 'none',
            transition: 'opacity 0.3s ease, filter 0.3s ease'
          }}
        />
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
}

export function $createImageNode({ src, altText, width, height }) {
  return new ImageNode(src, altText, width, height);
}

export function $isImageNode(node) {
  return node instanceof ImageNode;
}
