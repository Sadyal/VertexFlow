import { useState, useRef } from 'react';
import { Image as ImageIcon, Send, X, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const CreatePost = ({ onPostCreated, isLoading }) => {
  const { user, userAvatar } = useAuth();
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !image) return;

    const formData = new FormData();
    formData.append('content', content);
    if (image) formData.append('image', image);

    try {
      await onPostCreated(formData);
      setContent('');
      handleRemoveImage();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="composer-card compact-composer animate-slide-down">
      <div className="composer-horizontal-layout">
        <div className="author-avatar small-avatar">
          {userAvatar ? (
            <img 
              src={(userAvatar.startsWith('http') || userAvatar.startsWith('data:')) 
                ? userAvatar 
                : `${import.meta.env.VITE_API_URL}${userAvatar}`} 
              alt="Me" 
            />
          ) : (
            user?.name?.charAt(0) || 'U'
          )}
        </div>

        <form onSubmit={handleSubmit} className="composer-form-inline">
          <input
            placeholder={`What's on your mind, ${user?.name?.split(' ')[0]}?`}
            className="composer-bar-input"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isLoading}
          />
          
          <div className="composer-actions-inline">
            <label className="icon-action-btn" title="Add Image" aria-label="Upload image to post">
              <ImageIcon size={20} aria-hidden="true" />
              <input 
                type="file" 
                hidden 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleImageChange}
                aria-label="File input"
              />
            </label>
            
            <button 
              type="submit" 
              className="post-submit-btn-inline"
              disabled={isLoading || (!content.trim() && !image)}
              aria-label="Send post"
            >
              {isLoading ? <div className="mini-spinner" aria-hidden="true"></div> : <Send size={18} aria-hidden="true" />}
            </button>
          </div>
        </form>
      </div>
      
      {preview && (
        <div className="image-preview-bar">
          <img src={preview} alt="Preview" />
          <button className="remove-preview-btn" onClick={handleRemoveImage}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default CreatePost;
