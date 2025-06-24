// Path: /student/:id

import { useParams } from "react-router";
import { Button } from "@/components/ui/button.tsx";
import { useNavigate } from "react-router";
import { generateMarkForTask, getStudent, setStudentMark } from "@/lib/utils.ts";
import { useEffect, useState } from "react";
import { IoChevronBackOutline } from "react-icons/io5";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import ReactLoading from "react-loading";
import { Student } from "@/lib/types.ts";

class Mark {
  id: number;
  mark: number;

  constructor(id: number, mark: number) {
    this.id = id;
    this.mark = mark;
  }
}

const StudentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogLoading, setDialogLoading] = useState(true);
  const [newMark, setNewMark] = useState<Mark | null>(null);

  useEffect(() => {
    if (!id || isNaN(Number(id))) {
      navigate("/error", { replace: true });
      return;
    }

    (async () => {
      const studentData = await getStudent(Number(id));
      setStudent(studentData);
      setLoading(false);
    })();
  }, [id, navigate]);

  const generate = async (taskId: number) => {
    setDialogOpen(true);
    setDialogLoading(true);

    const mark = await generateMarkForTask(Number(id), taskId);
    setNewMark(new Mark(taskId, mark));
    setDialogLoading(false);
  };

  const confirmMark = async () => {
    if (newMark) {
      await setStudentMark(Number(id), newMark.id, newMark.mark);
      setDialogOpen(false);
      setNewMark(null);

      const updatedStudent = await getStudent(Number(id));
      setStudent(updatedStudent);
    }
  };

  const calculateAverage = (tasks: any[]) => {
    const validTasks = tasks.filter((task) => typeof task === "number");
    const total = validTasks.reduce((sum, task) => sum + task, 0);
    return validTasks.length ? (total / validTasks.length).toFixed(2) : "0.00";
  };

  return (
    <div className="w-full h-screen p-5">
      <div className="mb-6 flex items-center justify-between">
        <Button onClick={() => navigate(-1)} variant="outline">
          <IoChevronBackOutline />
        </Button>
        <h1 className="text-2xl font-bold">{loading ? "Loading student data..." : student?.name}</h1>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-full">
          <ReactLoading type="spin" color="#000" height={50} width={50} />
        </div>
      ) : student ? (
        <div>
          <div className="mb-6 pb-4 border-b">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <span className="font-semibold">ID:</span> {id}
              </div>
              <div>
                <span className="font-semibold">EPA:</span> {student.epa}
              </div>
              <div>
                <span className="font-semibold">Average:</span> {calculateAverage(student.tasks)}
              </div>
              <div>
                <span className="font-semibold">Class ID:</span> {student.class_id}
              </div>
            </div>
          </div>

          <h2 className="text-xl font-semibold mb-4">Tasks</h2>
          <table className="min-w-full border">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b text-left">#</th>
                <th className="py-2 px-4 border-b text-left">Task</th>
              </tr>
            </thead>
            <tbody>
              {student.tasks.map((task: any, index: number) => (
                <tr key={index} className="border-b">
                  <td className="py-2 px-4">{index + 1}</td>
                  <td className="py-2 px-4">
                    {task === "none" || task === null || task === undefined ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => generate(index + 1)}
                      >
                        Generate
                      </Button>
                    ) : (
                      <span>{task}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center text-gray-500">No student found with ID {id}.</p>
      )}

      <Dialog open={dialogOpen}>
        <DialogContent className="[&>button]:hidden">
          <DialogHeader>
            <DialogTitle>{dialogLoading ? "Generating Marks..." : "Marks Generated"}</DialogTitle>
          </DialogHeader>
          <DialogDescription className="flex flex-col items-center justify-center text-center">
            {dialogLoading ? (
              <ReactLoading type="spin" color="#000" height={50} width={50} />
            ) : (
              <>
                <p className="mb-4">Marks generated successfully!</p>
                <p className="mb-4">New Mark: {newMark?.mark}</p>
              </>
            )}
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            {!dialogLoading && (
              <Button variant={"destructive"} onClick={confirmMark}>Confirm</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentPage;

