import React, { useEffect, useState } from 'react';

interface UserAvatarProps {
  name?: string;
  src?: string;
  className?: string;
  imageClassName?: string;
}

const initials = (name?: string) => (name || 'User').trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'U';

const UserAvatar: React.FC<UserAvatarProps> = ({ name, src, className = 'h-10 w-10', imageClassName = '' }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary-500 to-secondary-600 font-bold text-white ${className}`} aria-label={`${name || 'User'} profile picture`}>
      {src && !failed ? <img src={src} alt="" className={`h-full w-full object-cover ${imageClassName}`} onError={() => setFailed(true)} /> : <span aria-hidden="true">{initials(name)}</span>}
    </span>
  );
};

export default UserAvatar;
