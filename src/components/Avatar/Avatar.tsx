import type { CSSProperties } from 'react';
import { useBlobImage } from '../../hooks/useBlobImage';
import { initials } from '../../lib/initials';
import styles from './Avatar.module.css';

interface AvatarProps {
  name: string;
  /** Background colour for the initials fallback. */
  color: string;
  imageBlob?: Blob;
  /** Diameter in px. */
  size?: number;
}

/** A person's photo in a circle, or their initials on their colour when there's no photo. */
export function Avatar({ name, color, imageBlob, size = 40 }: AvatarProps) {
  const imageRef = useBlobImage(imageBlob);
  const style = { '--size': `${size}px`, '--avatar-bg': color } as CSSProperties;

  return (
    <span className={styles.avatar} style={style} role="img" aria-label={name}>
      {imageBlob ? (
        <img ref={imageRef} alt="" className={styles.image} />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}
