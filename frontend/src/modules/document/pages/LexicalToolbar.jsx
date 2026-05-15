import React from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { 
  FORMAT_TEXT_COMMAND, 
  FORMAT_ELEMENT_COMMAND, 
  UNDO_COMMAND, 
  REDO_COMMAND 
} from 'lexical';
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, 
  Undo, Redo, List, ListOrdered, Type, Code,
  Plus, Minus, Table as TableIcon, Trash2 as DeleteIcon, Rows, Columns
} from 'lucide-react';
import { 
  INSERT_ORDERED_LIST_COMMAND, 
  INSERT_UNORDERED_LIST_COMMAND, 
  REMOVE_LIST_COMMAND
} from '@lexical/list';
import { $createImageNode } from './ImageNode.jsx';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import { 
  INSERT_TABLE_COMMAND
} from '@lexical/table';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { $getSelection, $isRangeSelection, $getNearestNodeFromDOMNode, $createParagraphNode } from 'lexical';
import { $patchStyleText } from '@lexical/selection';
import { CheckSquare, Palette, Highlighter, Image as ImageIcon, ChevronDown } from 'lucide-react';

const ToolbarButton = ({ onClick, icon: Icon, active, title }) => (
  <button
    className={`toolbar-item ${active ? 'is-active' : ''}`}
    onClick={onClick}
    title={title}
  >
    <Icon size={18} />
  </button>
);

export default function LexicalToolbar() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = React.useState(false);
  const [isItalic, setIsItalic] = React.useState(false);
  const [isUnderline, setIsUnderline] = React.useState(false);
  const [isCode, setIsCode] = React.useState(false);
  const [blockType, setBlockType] = React.useState('paragraph');
  const [alignment, setAlignment] = React.useState('left');
  const [fontSize, setFontSize] = React.useState(16);
  const [currentColor, setCurrentColor] = React.useState('#ffffff');
  const [currentBgColor, setCurrentBgColor] = React.useState('transparent');
  const fileInputRef = React.useRef(null);

  // 🚀 MONITOR SELECTION STATE
  React.useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          setIsBold(selection.hasFormat('bold'));
          setIsItalic(selection.hasFormat('italic'));
          setIsUnderline(selection.hasFormat('underline'));
          setIsCode(selection.hasFormat('code'));
          
          // Detect Block Type (Simplified)
          const anchorNode = selection.anchor.getNode();
          const element = anchorNode.getKey() === 'root' 
            ? anchorNode 
            : anchorNode.getTopLevelElementOrThrow();
          
          if (element) {
            const tag = element.getTag?.() || 'p';
            setBlockType(tag === 'p' ? 'paragraph' : tag);
            setAlignment(element.getFormatType() || 'left');
          }
        }
      });
    });
  }, [editor]);

  const formatText = (format) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatElement = (format) => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, format);
  };

  const applyStyle = (styles) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, styles);
      }
    });
  };

  const insertImage = (base64) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        // We insert an image node if registered, otherwise we use HTML injection
        // Since we are adding ImageNode next, we'll use a placeholder logic here
        const imgNode = $createImageNode({ src: base64, altText: 'Uploaded Image' });
        selection.insertNodes([imgNode]);
      }
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // 🚀 PERFORMANCE OPTIMIZATION: Resize & Compress
          // This prevents large Base64 strings from slowing down real-time sync
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1000; // Cap width at 1000px
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          // Use high-quality interpolation
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          ctx.drawImage(img, 0, 0, width, height);

          // 📦 Compress to 60% quality JPEG (Great balance of size and clarity)
          const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.6);
          insertImage(optimizedBase64);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="lexical-toolbar">
      <div className="toolbar-group" style={{ display: 'flex', gap: '0.25rem' }}>
        <ToolbarButton 
          onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} 
          icon={Undo} 
          title="Undo" 
        />
        <ToolbarButton 
          onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} 
          icon={Redo} 
          title="Redo" 
        />
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group" style={{ display: 'flex', gap: '0.25rem' }}>
        <ToolbarButton 
          onClick={() => formatText('bold')} 
          icon={Bold} 
          title="Bold" 
          active={isBold}
        />
        <ToolbarButton 
          onClick={() => formatText('italic')} 
          icon={Italic} 
          title="Italic" 
          active={isItalic}
        />
        <ToolbarButton 
          onClick={() => formatText('underline')} 
          icon={Underline} 
          title="Underline" 
          active={isUnderline}
        />
        <ToolbarButton 
          onClick={() => formatText('code')} 
          icon={Code} 
          title="Inline Code" 
          active={isCode}
        />
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group" style={{ display: 'flex', gap: '0.25rem' }}>
        <select 
          className="toolbar-select block-type-select"
          style={{ width: '120px' }}
          onChange={(e) => {
            const type = e.target.value;
            editor.update(() => {
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                if (type === 'h1') $setBlocksType(selection, () => $createHeadingNode('h1'));
                else if (type === 'h2') $setBlocksType(selection, () => $createHeadingNode('h2'));
                else if (type === 'h3') $setBlocksType(selection, () => $createHeadingNode('h3'));
                else if (type === 'h4') $setBlocksType(selection, () => $createHeadingNode('h4')); // Subtitle
                else if (type === 'quote') $setBlocksType(selection, () => $createQuoteNode());
                else $setBlocksType(selection, () => $createParagraphNode());
              }
            });
          }}
          title="Block Type"
        >
          <option value="paragraph">Normal Text</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Subtitle</option>
          <option value="quote">Quote</option>
        </select>
        
        <ToolbarButton 
          onClick={() => {
            editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
          }} 
          icon={List} 
          title="Bullet List" 
        />
        
        <ToolbarButton 
          onClick={() => fileInputRef.current?.click()} 
          icon={ImageIcon} 
          title="Upload Image" 
        />
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*"
          onChange={handleFileUpload}
        />
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group" style={{ display: 'flex', gap: '0.25rem' }}>
        <ToolbarButton 
          onClick={() => formatElement('left')} 
          icon={AlignLeft} 
          title="Align Left" 
          active={alignment === 'left'}
        />
        <ToolbarButton 
          onClick={() => formatElement('center')} 
          icon={AlignCenter} 
          title="Align Center" 
          active={alignment === 'center'}
        />
        <ToolbarButton 
          onClick={() => formatElement('right')} 
          icon={AlignRight} 
          title="Align Right" 
          active={alignment === 'right'}
        />
      </div>
      <div className="toolbar-divider" />

      <div className="toolbar-group" style={{ display: 'flex', gap: '0.25rem' }}>
        <select 
          className="toolbar-select"
          onChange={(e) => applyStyle({ 'font-family': e.target.value })}
          title="Font Family"
        >
          <option value="Inter">Inter</option>
          <option value="Roboto">Roboto</option>
          <option value="Montserrat">Montserrat</option>
          <option value="Playfair Display">Playfair</option>
          <option value="Courier New">Courier</option>
          <option value="Georgia">Georgia</option>
        </select>

        <div className="font-size-controls" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button className="toolbar-item small" onClick={() => {
            const next = Math.max(8, fontSize - 1);
            setFontSize(next);
            applyStyle({ 'font-size': `${next}px` });
          }}><Minus size={14} /></button>
          
          <span style={{ fontSize: '12px', minWidth: '25px', textAlign: 'center' }}>{fontSize}</span>
          
          <button className="toolbar-item small" onClick={() => {
            const next = Math.min(72, fontSize + 1);
            setFontSize(next);
            applyStyle({ 'font-size': `${next}px` });
          }}><Plus size={14} /></button>
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <div className="color-picker-wrapper" title="Text Color">
          <Palette size={18} style={{ color: currentColor === '#ffffff' ? 'var(--text-secondary)' : currentColor }} />
          <input 
            type="color" 
            onChange={(e) => {
              const color = e.target.value;
              setCurrentColor(color);
              applyStyle({ color });
            }} 
            className="toolbar-color-input" 
          />
        </div>
        <div className="color-picker-wrapper" title="Highlight Color">
          <Highlighter size={18} style={{ color: currentBgColor === 'transparent' ? 'var(--text-secondary)' : currentBgColor }} />
          <input 
            type="color" 
            onChange={(e) => {
              const color = e.target.value;
              setCurrentBgColor(color);
              applyStyle({ 'background-color': color });
            }} 
            className="toolbar-color-input" 
          />
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group" style={{ display: 'flex', gap: '0.25rem' }}>
        <ToolbarButton 
          onClick={() => editor.dispatchCommand(INSERT_TABLE_COMMAND, { columns: '3', rows: '3' })} 
          icon={TableIcon} 
          title="Insert Table" 
        />
      </div>
      <div className="toolbar-group">
        <ToolbarButton 
          onClick={() => {
            editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
          }} 
          icon={Minus} 
          title="Horizontal Rule" 
        />
      </div>
    </div>
  );
}
