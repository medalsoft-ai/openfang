// ImageAttachments - Display uploaded/generated images in chat
import { motion } from 'framer-motion';
import { ImageIcon } from 'lucide-react';

interface ImageAttachment {
  file_id: string;
  filename?: string;
}

interface ImageAttachmentsProps {
  images: ImageAttachment[];
}

export function ImageAttachments({ images }: ImageAttachmentsProps) {
  if (!images || images.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 my-2">
      {images.map((img, index) => (
        <motion.a
          key={img.file_id}
          href={`/api/uploads/${img.file_id}`}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05, duration: 0.2 }}
          className="block group"
        >
          <div className="relative overflow-hidden rounded-lg border border-[var(--border-default)] hover:border-[var(--neon-cyan)] transition-colors">
            <img
              src={`/api/uploads/${img.file_id}`}
              alt={img.filename || 'Attached image'}
              className="max-w-[240px] max-h-[240px] object-cover block"
              loading="lazy"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-[var(--neon-cyan)]/0 group-hover:bg-[var(--neon-cyan)]/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <ImageIcon className="w-6 h-6 text-[var(--neon-cyan)]" />
            </div>
          </div>
          {img.filename && (
            <div className="text-[10px] text-[var(--text-muted)] mt-1 truncate max-w-[240px]">
              {img.filename}
            </div>
          )}
        </motion.a>
      ))}
    </div>
  );
}
