import { 
  Undo, Redo, Bold, Italic, Underline, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Code, Highlighter, 
  Link as LinkIcon, CheckSquare, Table as TableIcon,
  Image as ImageIcon, Subscript, Superscript, Type
} from 'lucide-react';
import './EditorToolbar.css';

/**
 * @component EditorToolbar
 * @description Advanced toolbar for the Tiptap editor. Supports complex Word-like
 * features such as tables, task lists, highlighters, and media insertion.
 */
const EditorToolbar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  const isActive = (name, attributes) => editor.isActive(name, attributes) ? 'is-active' : '';

  // ==========================================
  // HANDLERS
  // ==========================================
  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const addImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (readerEvent) => {
          const content = readerEvent.target.result;
          editor.chain().focus().setImage({ src: content }).run();
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const updateImageSize = (width) => {
    editor.chain().focus().updateAttributes('image', { width }).run();
  };

  return (
    <div className="tiptap-toolbar">
      {/* History */}
      <div className="toolbar-group">
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="toolbar-btn"
          title="Undo"
        >
          <Undo size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="toolbar-btn"
          title="Redo"
        >
          <Redo size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Headings & Fonts */}
      <div className="toolbar-group">
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`toolbar-btn text-btn ${isActive('heading', { level: 1 })}`}
          title="Heading 1"
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`toolbar-btn text-btn ${isActive('heading', { level: 2 })}`}
          title="Heading 2"
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={`toolbar-btn text-btn ${isActive('paragraph')}`}
          title="Paragraph"
        >
          P
        </button>
        
        {/* Color Picker Native */}
        <label className="toolbar-btn color-picker-wrapper" title="Text Color">
          <Type size={16} />
          <input
            type="color"
            className="color-picker-input"
            onInput={event => editor.chain().focus().setColor(event.target.value).run()}
            value={editor.getAttributes('textStyle').color || '#000000'}
          />
        </label>
      </div>

      <div className="toolbar-divider" />

      {/* Text Formatting */}
      <div className="toolbar-group">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`toolbar-btn ${isActive('bold')}`}
          title="Bold"
        >
          <Bold size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`toolbar-btn ${isActive('italic')}`}
          title="Italic"
        >
          <Italic size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`toolbar-btn ${isActive('underline')}`}
          title="Underline"
        >
          <Underline size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`toolbar-btn ${isActive('strike')}`}
          title="Strikethrough"
        >
          <Strikethrough size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={`toolbar-btn ${isActive('highlight')}`}
          title="Highlight"
        >
          <Highlighter size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />
      
      {/* Scripting */}
      <div className="toolbar-group">
        <button
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          className={`toolbar-btn ${isActive('subscript')}`}
          title="Subscript"
        >
          <Subscript size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          className={`toolbar-btn ${isActive('superscript')}`}
          title="Superscript"
        >
          <Superscript size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Alignment */}
      <div className="toolbar-group">
        <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`toolbar-btn ${isActive({ textAlign: 'left' })}`} title="Align Left">
          <AlignLeft size={16} />
        </button>
        <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`toolbar-btn ${isActive({ textAlign: 'center' })}`} title="Align Center">
          <AlignCenter size={16} />
        </button>
        <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`toolbar-btn ${isActive({ textAlign: 'right' })}`} title="Align Right">
          <AlignRight size={16} />
        </button>
        <button onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={`toolbar-btn ${isActive({ textAlign: 'justify' })}`} title="Justify">
          <AlignJustify size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Lists & Advanced Blocks */}
      <div className="toolbar-group">
        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`toolbar-btn ${isActive('bulletList')}`} title="Bullet List">
          <List size={16} />
        </button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`toolbar-btn ${isActive('orderedList')}`} title="Numbered List">
          <ListOrdered size={16} />
        </button>
        <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={`toolbar-btn ${isActive('taskList')}`} title="Task List">
          <CheckSquare size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Media & Tables */}
      <div className="toolbar-group">
        <button onClick={setLink} className={`toolbar-btn ${isActive('link')}`} title="Insert Link">
          <LinkIcon size={16} />
        </button>
        <button onClick={addImage} className="toolbar-btn" title="Insert Image (from System)">
          <ImageIcon size={16} />
        </button>
        <button 
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} 
          className="toolbar-btn" 
          title="Insert Table (3x3)"
        >
          <TableIcon size={16} />
        </button>
      </div>

      {/* Image Actions (Conditional) */}
      {(editor.isActive('image') || (editor.state.selection.node && editor.state.selection.node.type.name === 'image')) && (
        <>
          <div className="toolbar-divider" />
          <div className="toolbar-group">
            <button 
              onClick={() => updateImageSize('25%')} 
              className={`toolbar-btn text-btn ${editor.getAttributes('image').width === '25%' ? 'is-active' : ''}`} 
              title="Small (25%)"
            >
              S
            </button>
            <button 
              onClick={() => updateImageSize('50%')} 
              className={`toolbar-btn text-btn ${editor.getAttributes('image').width === '50%' ? 'is-active' : ''}`} 
              title="Medium (50%)"
            >
              M
            </button>
            <button 
              onClick={() => updateImageSize('100%')} 
              className={`toolbar-btn text-btn ${(!editor.getAttributes('image').width || editor.getAttributes('image').width === '100%') ? 'is-active' : ''}`} 
              title="Full Width (100%)"
            >
              F
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default EditorToolbar;
