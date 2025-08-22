import React, { useState } from "react";
import { Expand } from "lucide-react";

function TaskList() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div>
      <button
        title="Lab Data"
        className="p-1 cursor-pointer rounded-sm bg-blue-500 hover:bg-blue-600 text-white"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Expand size={16} />
      </button>

      {isExpanded && (
        <div className="h-24 mt-2 bg-gray-100 p-2 rounded">Task Data here</div>
      )}
    </div>
  );
}

export default TaskList;
