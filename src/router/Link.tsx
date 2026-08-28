import React, { ReactNode, MouseEvent } from 'react';
import { useRouter } from './RouterContext';
import { AppRoute } from '../types/navigation';

interface LinkProps {
  to: AppRoute | string;
  children: ReactNode;
  className?: string;
  id?: string;
  onClick?: () => void;
}

export const Link: React.FC<LinkProps> = ({ to, children, className = '', id, onClick }) => {
  const { navigate } = useRouter();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (onClick) onClick();
    navigate(to);
  };

  return (
    <a href={to} id={id} onClick={handleClick} className={className}>
      {children}
    </a>
  );
};
