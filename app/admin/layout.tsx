import { Navigation } from "@/components/navigation";
import React from "react";

type Props = {
  children: React.ReactNode;
};

const layout = ({ children }: Props) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      {children}
    </div>
  );
};

export default layout;
