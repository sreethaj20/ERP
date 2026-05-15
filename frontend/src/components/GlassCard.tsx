import React from 'react';

interface GlassCardProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const GlassCard: React.FC<GlassCardProps> = ({
  title,
  subtitle,
  icon,
  headerAction,
  children,
  className = "",
  style,
  onClick
}) => {
  return (
    <div
      className={`glass-card ${className}`}
      style={{
        backdropFilter: 'blur(25px)',
        background: 'var(--glass-bg)',
        border: '1px solid var(--border-light)',
        borderRadius: '24px',
        padding: '24px',
        ...style
      }}
      onClick={onClick}
    >
      {(title || subtitle || headerAction || icon) && (
        <div style={{ marginBottom: "20px", display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {icon && <div style={{ fontSize: '24px', color: 'var(--accent-primary)', display: 'flex' }}>{icon}</div>}
            <div>
              {title && <h3 className="card-title" style={{ margin: 0 }}>{title}</h3>}
              {subtitle && <p className="card-subtitle" style={{ margin: '4px 0 0 0' }}>{subtitle}</p>}
            </div>
          </div>
          {headerAction && <div className="card-action">{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export default GlassCard;
