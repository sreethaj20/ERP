import React from 'react';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    glass?: boolean;
}

const GlassButton: React.FC<GlassButtonProps> = ({ 
    children, 
    variant = 'primary', 
    glass = true,
    style,
    className,
    ...props 
}) => {
    const getBaseStyles = (): React.CSSProperties => {
        let base: React.CSSProperties = {
            padding: '12px 24px',
            borderRadius: '14px',
            fontSize: '15px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            outline: 'none',
            userSelect: 'none',
            position: 'relative',
            overflow: 'hidden',
        };

        if (variant === 'primary') {
            base.background = 'linear-gradient(135deg, #0a84ff 0%, #0070e0 100%)';
            base.color = '#fff';
            base.boxShadow = '0 4px 15px rgba(10, 132, 255, 0.3)';
        } else if (variant === 'danger') {
            base.background = 'linear-gradient(135deg, #ff453a 0%, #d70015 100%)';
            base.color = '#fff';
            base.boxShadow = '0 4px 15px rgba(255, 69, 58, 0.3)';
        } else if (variant === 'secondary') {
            base.background = 'rgba(255, 255, 255, 0.05)';
            base.color = 'var(--text-secondary)';
        } else {
            base.background = 'transparent';
            base.color = 'var(--text-secondary)';
            base.border = 'none';
        }

        if (glass) {
            base.backdropFilter = 'blur(10px)';
            base.WebkitBackdropFilter = 'blur(10px)';
        }

        return base;
    };

    return (
        <button
            {...props}
            style={{ ...getBaseStyles(), ...style }}
            className={`glass-button-active-scale ${className || ''}`}
        >
            <style>{`
                .glass-button-active-scale:active {
                    transform: scale(0.96);
                    filter: brightness(0.9);
                }
                .glass-button-active-scale:hover {
                    filter: brightness(1.1);
                    transform: translateY(-1px);
                    box-shadow: 0 6px 20px rgba(0, 112, 224, 0.4);
                }
                .glass-button-active-scale:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                }
            `}</style>
            {children}
        </button>
    );
};

export default GlassButton;
