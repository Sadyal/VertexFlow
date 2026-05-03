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
  Undo, Redo, List, ListOrdered, Type, Code
} from 'lucide-react';
import { 
  INSERT_ORDERED_LIST_COMMAND, 
  INSERT_UNORDERED_LIST_COMMAND, 
  REMOVE_LIST_COMMAND 
} from '@lexical/list';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { $getSelection, $isRangeSelection, $getNearestNodeFromDOMNode } from 'lexical';

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

  const formatText = (format) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatElement = (format) => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, format);
  };

  return (
    <div className="tiptap-toolbar" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
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
        />
        <ToolbarButton 
          onClick={() => formatText('italic')} 
          icon={Italic} 
          title="Italic" 
        />
        <ToolbarButton 
          onClick={() => formatText('underline')} 
          icon={Underline} 
          title="Underline" 
        />
        <ToolbarButton 
          onClick={() => formatText('code')} 
          icon={Code} 
          title="Inline Code" 
        />
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group" style={{ display: 'flex', gap: '0.25rem' }}>
        <ToolbarButton 
          onClick={() => {
            editor.update(() => {
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                $setBlocksType(selection, () => $createHeadingNode('h1'));
              }
            });
          }} 
          icon={Type} 
          title="Heading 1" 
        />
        <ToolbarButton 
          onClick={() => {
            editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
          }} 
          icon={List} 
          title="Bullet List" 
        />
        <ToolbarButton 
          onClick={() => {
            editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
          }} 
          icon={ListOrdered} 
          title="Ordered List" 
        />
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group" style={{ display: 'flex', gap: '0.25rem' }}>
        <ToolbarButton 
          onClick={() => formatElement('left')} 
          icon={AlignLeft} 
          title="Align Left" 
        />
        <ToolbarButton 
          onClick={() => formatElement('center')} 
          icon={AlignCenter} 
          title="Align Center" 
        />
        <ToolbarButton 
          onClick={() => formatElement('right')} 
          icon={AlignRight} 
          title="Align Right" 
        />
      </div>
      <div className="toolbar-divider" />

      <div className="toolbar-group" style={{ display: 'flex', gap: '0.25rem' }}>
        <select 
          className="toolbar-select"
          onChange={(e) => {
            editor.update(() => {
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                // Simplified font family logic
              }
            });
          }}
          title="Font Family"
        >
          <option value="Inter">Inter</option>
          <option value="Arial">Arial</option>
          <option value="Courier New">Courier</option>
          <option value="Georgia">Georgia</option>
        </select>

        <select 
          className="toolbar-select"
          onChange={(e) => {}} // TODO: Implement font size
          title="Font Size"
        >
          <option value="12px">12</option>
          <option value="14px">14</option>
          <option value="16px">16</option>
          <option value="18px">18</option>
          <option value="24px">24</option>
        </select>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <ToolbarButton 
          onClick={() => {
            editor.dispatchCommand(INSERT_TABLE_COMMAND, { columns: '3', rows: '3' });
          }} 
          icon={() => <span style={{fontSize: '10px', fontWeight: 'bold'}}>TBL</span>} 
          title="Insert Table" 
        />
      </div>
    </div>
  );
}
