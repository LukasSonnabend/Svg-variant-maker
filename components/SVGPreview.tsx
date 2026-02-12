
import React from 'react';

interface SVGPreviewProps {
  content: string;
  className?: string;
}

const SVGPreview: React.FC<SVGPreviewProps> = ({ content, className = "" }) => {
  return (
    <div 
      className={`relative overflow-hidden flex items-center justify-center ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

export default SVGPreview;
