import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';
import { v4 as uuidv4 } from 'uuid';

// ⚡ OPTIMIZE SHARP FOR LOW-MEMORY HOSTS (e.g. Render 512MB limit)
sharp.cache(false); 
sharp.concurrency(1);

// ☁️ Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * 🖼️ IMAGE PROCESSOR
 * Compresses images to WebP format and uploads them to Cloudinary.
 * This ensures images persist across deployments on ephemeral filesystems.
 */
export const processPostImage = async (fileBuffer) => {
  try {
    // 1. Process with Sharp to ensure high quality WebP and consistent sizing
    const processedBuffer = await sharp(fileBuffer)
      .resize(1200, null, { // Max width 1200px, maintain aspect ratio
        withoutEnlargement: true,
        fit: 'inside'
      })
      .webp({ quality: 75 }) // High compression WebP
      .toBuffer();

    // 2. Upload directly to Cloudinary using a Stream
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "vertexflow/posts",
          public_id: `post-${uuidv4()}`,
          resource_type: "image",
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary Stream Error:', error);
            return reject(new Error('Cloudinary upload failed'));
          }
          // Return the secure URL from Cloudinary
          resolve(result.secure_url);
        }
      );

      uploadStream.end(processedBuffer);
    });
  } catch (error) {
    console.error('❌ Image Processing Error:', error);
    throw new Error('Failed to process and upload image');
  }
};

export const processDocImage = async (fileBuffer) => {
  try {
    const processedBuffer = await sharp(fileBuffer)
      .resize(1600, null, { // Docs can have slightly larger images
        withoutEnlargement: true,
        fit: 'inside'
      })
      .webp({ quality: 80 })
      .toBuffer();

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "vertexflow/docs",
          public_id: `doc-img-${uuidv4()}`,
          resource_type: "image",
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary Stream Error:', error);
            return reject(new Error('Cloudinary upload failed'));
          }
          resolve(result.secure_url);
        }
      );
      uploadStream.end(processedBuffer);
    });
  } catch (error) {
    console.error('❌ Doc Image Processing Error:', error);
    throw new Error('Failed to process and upload document image');
  }
};

/**
 * 👤 AVATAR PROCESSOR
 * Converts a Base64 image to a binary buffer, resizes to a 400x400 square, 
 * compresses it to WebP format, and uploads it to Cloudinary.
 */
export const processAvatarImage = async (base64String) => {
  try {
    // 1. Convert base64 data URL to buffer
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
    const fileBuffer = Buffer.from(base64Data, 'base64');

    // 2. Process with Sharp (crop/resize to 400x400 square WebP)
    const processedBuffer = await sharp(fileBuffer)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 80 })
      .toBuffer();

    // 3. Upload directly to Cloudinary using a Stream
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "vertexflow/avatars",
          public_id: `avatar-${uuidv4()}`,
          resource_type: "image",
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary Avatar Stream Error:', error);
            return reject(new Error('Cloudinary avatar upload failed'));
          }
          // Return the secure URL from Cloudinary
          resolve(result.secure_url);
        }
      );

      uploadStream.end(processedBuffer);
    });
  } catch (error) {
    console.error('❌ Avatar Processing Error:', error);
    throw new Error('Failed to process and upload avatar');
  }
};

