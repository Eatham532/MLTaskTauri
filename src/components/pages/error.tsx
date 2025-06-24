import { useNavigate } from 'react-router';
import {Button} from "@/components/ui/button.tsx";

const ErrorPage = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold text-red-600 mb-4">Error</h1>
      <p className="text-lg mb-6">An unexpected error has occurred.</p>
      <Button
        onClick={handleGoBack}>
        Go Back
      </Button>
    </div>
  );
}

export default ErrorPage;