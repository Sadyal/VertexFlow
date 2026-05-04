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

  decorate() {
    return (
      <img
        src={this.__src}
        alt={this.__altText}
        className="editor-image"
        style={{
          width: this.__width,
          height: this.__height,
          display: 'block',
          maxWidth: '100%',
        }}
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
