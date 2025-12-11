import React from "react";

const Loading = () => {
  return (
    <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 dark:border-blue-400"></div>
    </div>
  );
};

export default Loading;
