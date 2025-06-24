import React from "react";
import {Button} from "@/components/ui/button.tsx";
import { useNavigate} from "react-router";

type HomePageProps = {
  csvPath: string;
};

const HomePage: React.FC<HomePageProps> = ({ csvPath }) => {
  console.log("HomePage rendered with csvPath:", csvPath);
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-4">Test Page</h1>
      <div>
        <span>Selected file path:</span>
        <div className="mt-2 text-blue-600 break-all">
          {csvPath || "No file selected"}
        </div>
        <Button onClick={()=>navigate("/")}>Navigate!</Button>
      </div>
    </div>
  );
};

export default HomePage;