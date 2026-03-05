import React from 'react'

interface SkeletonLoaderProps {
  count?: number
  height?: number
  width?: string
  circle?: boolean
  className?: string
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  count = 1,
  height = 20,
  width = '100%',
  circle = false,
  className = '',
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`skeleton ${className}`}
          style={{
            height: circle ? height : height,
            width: circle ? height : width,
            borderRadius: circle ? '50%' : '0.375rem',
            marginBottom: i < count - 1 ? '0.75rem' : '0',
          }}
        />
      ))}
    </>
  )
}

export default SkeletonLoader
