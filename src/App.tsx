import {useEffect, useState } from "react";
import "./App.css";
import { Button } from "@/components/ui/button";
import {Input} from "@/components/ui/input.tsx";
import {open, message} from "@tauri-apps/plugin-dialog";
import {exists} from "@tauri-apps/plugin-fs";
import HomePage from "@/components/pages/home.tsx";
import TestPage from "@/components/pages/test.tsx";
import { BrowserRouter as Router, Routes, Route } from "react-router";
import StudentPage from "@/components/pages/student.tsx";
import {getStoreValue, setStoreValue} from "@/lib/utils.ts";
import { useRef } from 'react';
import ErrorPage from "@/components/pages/error.tsx";

function App() {
  const [fileLocation, setFileLocation] = useState('');
  const [isSetupComplete, setIsSetupComplete] = useState(!!fileLocation);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [selectingFileLocation, setSelectingFileLocation] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const savedLocation = await getStoreValue<string>("fileLocation");
      if (savedLocation) {
        setFileLocation(savedLocation as string);
        setIsSetupComplete(true);
      }
      setPageLoaded(true);
    })();
  }, []);

  const handleFileLoad = async () => {
    const selected = await open({
      multiple: false,
      directory: false,
      filters: [{ name: "Student Database", extensions: ["csv"] }],
    });
    if (selected) {
      setFileLocation(selected as string);
    }
  };

  useEffect(() => {
    if (selectingFileLocation && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [selectingFileLocation]);

  const handlePathSubmission = async () => {
    // Once submitted, validate the path exists and set it in localStorage
    try {
      if (await exists(fileLocation) && fileLocation.endsWith(".csv")) {
        setIsSetupComplete(true);
        await setStoreValue('fileLocation', fileLocation);
      }
      else {
        console.error("File path does not exist or is not a CSV file.");
        await message("The specified file path does not exist. Please select a valid CSV file.", { title: 'Tauri', kind: 'error' });
      }
    }
    catch (error) {
      console.error("Error checking file existence:", error);
      await message("An error occurred while checking the file path. Path invalid. Please try again", { title: 'Tauri', kind: 'error' });
    }
  }

  return (
    <Router>
      <div className="root-div">
        {
          pageLoaded && !isSetupComplete ? (
              <div className={"p-10 h-full w-full flex flex-col justify-between items-center"}>
                <div className={"w-full"}>
                  <h1 className={"text-3xl"}>Setup</h1>
                </div>
                <div className={"h-full w-full flex flex-col justify-center items-center"}>
                  <div className="flex flex-col items-center space-x-5 space-y-3 max-w-xl w-full md:items-baseline md:flex-row">
                    <Input
                      type="text"
                      value={fileLocation}
                      onChange={(e) => setFileLocation(e.target.value)}
                      /*onClick={handleFileLoad}*/
                      placeholder="Path to CSV file"
                    />
                    <Button onClick={handleFileLoad} className={"w-fit"}>Select File</Button>
                  </div>
                </div>
                <div className={fileLocation ? "w-full flex justify-end" : "h-9"}>
                  <Button className={fileLocation ?  "" : "hidden"} onClick={handlePathSubmission}>Continue</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-screen w-screen">
                <div className={"grid grid-cols-[1fr_auto] w-full h-fit p-2 items-center shadow bg-accent/20" + (!selectingFileLocation ? "gap-5" : "")}>
                  {
                    !selectingFileLocation ? (
                      <>
                        <section className="text-sm space-x-1 flex items-center min-w-0 md:space-x-3"
                          onClick={() => setSelectingFileLocation(true)}>
                          <span className="block sm:hidden">Path:</span>
                          <span className="hidden sm:block">Selected file path:</span>
                          <p className="text-blue-800 dark:text-blue-200 truncate font-sans min-w-0 flex-1">
                            {fileLocation || "No file selected"}
                          </p>
                        </section>
                        <section>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={async () => {
                              await setStoreValue("fileLocation", "");
                              window.location.reload();
                            }}
                          >
                            Reset Setup
                          </Button>
                        </section>
                      </>
                    ) : (
                      <input
                        ref={inputRef}
                        className="w-full p-2 border rounded font-mono text-blue-800 dark:text-blue-200 bg-white dark:bg-gray-800"
                        value={fileLocation}
                        readOnly
                        onBlur={() => setSelectingFileLocation(false)}
                        onKeyDown={e => {
                          if (e.key === "Enter" || e.key === "Escape") {
                            setSelectingFileLocation(false);
                          }
                        }}
                      />
                    )
                  }
                </div>
                <Routes>
                  <Route path="/" element={<HomePage csvPath={fileLocation} />} />
                  <Route path="/test" element={<TestPage csvPath={fileLocation} />} />
                  <Route path="/student/:id" element={<StudentPage />} />
                  <Route path="*" element={<ErrorPage />} />
                </Routes>
              </div>
            )
        }
      </div>
    </Router>
  );
}

export default App;
