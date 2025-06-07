import Link from "next/link";
import React from "react";

const footerBar = () => {
  return (
    <div className="sticky z-50 bottom-0 left-0 h-15 border-2 w-full flex items-center justify-center">
      <p className="text-sm text-gray-500">
        &copy; {new Date().getFullYear()} Design & Develop by{" "}
        <Link href={"https://claviq.com"}>
          <span className="text-orange-600 font-semibold">Claviq</span>
        </Link>
        . All rights reserved.
      </p>
    </div>
  );
};

export default footerBar;
