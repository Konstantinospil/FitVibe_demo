import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "../ui/Button";

export interface BackButtonProps {
  to?: string;
  label?: string;
  onClick?: () => void;
  className?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  to,
  label = "Back",
  onClick,
  className = "",
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      leftIcon={<ArrowLeft size={16} />}
      onClick={handleClick}
      className={className}
    >
      {label}
    </Button>
  );
};
