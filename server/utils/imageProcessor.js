import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

/**
 * 🖼️ IMAGE PROCESSOR
 * Compresses images to WebP format and resizes them for the "Free Tier".
 * Typically reduces size by 80-90% without visible loss.
 */
export const processPostImage = async (fileBuffer) => {
  try {
    const filename = `post-${uuidv4()}.webp`;
    const uploadDir = path.join(process.cwd(), 'uploads', 'posts');

    // Ensure directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    const outputPath = path.join(uploadDir, filename);

    await sharp(fileBuffer)
      .resize(1200, null, { // Max width 1200px, maintain aspect ratio
        withoutEnlargement: true,
        fit: 'inside'
      })
      .webp({ quality: 75 }) // High compression WebP
      .toFile(outputPath);

    // Return the relative URL (to be stored in DB)
    return `/uploads/posts/${filename}`;
  } catch (error) {
    console.error('❌ Image Processing Error:', error);
    throw new Error('Failed to process image');
  }
};
