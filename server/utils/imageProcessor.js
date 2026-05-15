import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';
import { v4 as uuidv4 } from 'uuid';

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
