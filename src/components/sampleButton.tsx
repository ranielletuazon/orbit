import React from 'react'

interface ButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ onClick, children, disabled }) => {
  return (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className="button"
    >
      {children}
    </button>
  )
}

export default Button