import React, {useEffect, useState} from "react";
import { useNavigate } from "react-router";
import { pyInvoke } from "tauri-plugin-pytauri-api";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import {toast} from "sonner";
import { Button } from "@/components/ui/button";
import { IoReloadOutline, IoAlert } from "react-icons/io5";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Student } from "@/lib/types.ts";

type HomePageProps = {
  csvPath: string;
};

const HomePage: React.FC<HomePageProps> = ({ csvPath }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [getStudents, setStudents] = useState([] as Student[]);
  const [getEmptyTasks, setEmptyTasks] = useState([] as { studentId: string, taskIndex: number }[]);
  const [getSortedStudents, setSortedStudents] = useState([] as Student[]);
  const [sortBy, setSortBy] = useState("id");
  const [getSearchFilterBy, setSearchFilterBy] = useState("id");
  const [getSearchQuery, setSearchQuery] = useState("");
  const [showEmptyTasks, setShowEmptyTasks] = useState(false);

  const [getScrollPosition, setScrollPosition] = useState(0);


  useEffect(() => {
    if (getStudents.length === 0) return;
    let students = [...getStudents];

    if (getSearchQuery != "") {
      const filterBy = getSearchFilterBy;
      const query = getSearchQuery.toLowerCase();
      students = students.filter(student => {
        if (filterBy === "id") {
          return student.id.toString().includes(query);
        } else if (filterBy === "name") {
          return student.name.toLowerCase().includes(query);
        } else if (filterBy === "class") {
          return student.class_id.toString().toLowerCase().includes(query);
        }
        return false;
      })
    }

    students.sort((a, b) => {
      // If the student is in empty tasks, move it to the front
      if (showEmptyTasks) {
        const aHasEmptyTask = getEmptyTasks.some(task => task.studentId === a.id);
        const bHasEmptyTask = getEmptyTasks.some(task => task.studentId === b.id);
        if (aHasEmptyTask && !bHasEmptyTask) return -1;
        if (!aHasEmptyTask && bHasEmptyTask) return 1;
      }

      if (sortBy === "id") {
        return Number(a.id) - Number(b.id);
      } else if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      } else if (sortBy === "class") {
        return Number(a.class_id) - Number(b.class_id);
      }
      return 0;
    });

    setSortedStudents(students);
  }, [sortBy, getStudents, getSearchQuery, getSearchFilterBy, showEmptyTasks]);

  useEffect(() => {
    if (csvPath) {
      updateStudents();
    }
  }, [csvPath]);

  const updateStudents = async () => {
    const s = await pyInvoke<Student[]>("get_students", { csvPath })
    if (s) {
      setStudents(s);
      console.log("S")

      // Only check for empty tasks after students are loaded
      if (s.length > 0) {
        const emptyTasks = checkForEmptyTasks(s);
        if (emptyTasks.length > 0) {
          toast("Some students have tasks with no set marks!", {
            description: `There are ${emptyTasks.length} students with empty tasks. Click to view.`,
            action: {
              label: "View",
              onClick: () => setShowEmptyTasks(true),
            },
          });
        }
        setEmptyTasks(emptyTasks)
      }
    }

    setLoading(false);
  }

  const checkForEmptyTasks = (students: Student[]) => {
    // Returns list student id and task index if any student has an empty task

    const emptyTasks: { studentId: string, taskIndex: number }[] = [];
    students.forEach(student => {
      student.tasks.forEach((task, index) => {
        if (task === "" || task === null || task === undefined) {
          emptyTasks.push({ studentId: student.id, taskIndex: index + 1  });
        }
      });
    });
    return emptyTasks;
  }

  const handleStudentClicked = (id: string) => {
    navigate(`/student/${id}`);
  }

  return (
    <div className="flex flex-col flex-1 w-full overflow-hidden p-2">

      <div className={"flex space-x-4 space-y-2 flex-col justify-between mb-4 md:flex-row"}>
        <div className={"flex space-x-2"}>
          <Label>Sort by:</Label>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a value" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="id">ID</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="class">Class</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <section className={"flex items-center space-x-2"}>
          <Label>Show students with empty tasks:</Label>
          <Checkbox checked={showEmptyTasks} onCheckedChange={() => setShowEmptyTasks(!showEmptyTasks)} />
        </section>

        <div className={"flex space-x-3 space-y-3 flex-col sm:flex-row"}>
          <Input min={-1} value={getSearchQuery} onChange={e => {
            const value = e.target.value;
            if (getSearchFilterBy === "name") {
              setSearchQuery(value);
            }
            else if (getSearchFilterBy === "id" || getSearchFilterBy === "class") {
              // If number is less than 0, set it to empty string
              const numValue = Number(value);
              if (numValue < 0) {
                setSearchQuery("");
              } else {
                setSearchQuery(value)
              }
            }

          }} type={getSearchFilterBy == "name" ? "text" : "number"} placeholder={"Search..."} />
          <Label className={"md:whitespace-nowrap"}>Search by:</Label>
          <Select value={getSearchFilterBy} onValueChange={(value) => setSearchFilterBy(value)}>
            <SelectTrigger className="w-[180px] text-foreground">
              <SelectValue placeholder="Select a value" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="id">ID</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="class">Class</SelectItem>
            </SelectContent>
          </Select>
          <Button variant={"secondary"} size={"icon"} onClick={() => updateStudents()}><IoReloadOutline /></Button>
        </div>
      </div>

      {
        loading ? (
          <div>Loading...</div>
        ) : (
          getStudents.length === 0 ? (
            <div className="text-muted-foreground">No students found.</div>
          ) : (
            <div className="flex-1 overflow-clip overflow-y-auto scroll pr-1"
                 onScroll={(e) =>
                   setScrollPosition((e.target as HTMLElement).scrollTop)}>
              <table className="w-full border-gray-200 text-foreground">
                <thead className={"sticky top-0 bg-background" + (getScrollPosition > 0 ? " shadow" : "")}>
                  <tr className={"text-left"}>
                    <th className="px-4 py-2 border-b"></th>
                    <th className="px-4 py-2 border-b">ID</th>
                    <th className="px-4 py-2 border-b">Name</th>
                    <th className="px-4 py-2 border-b">Class ID</th>
                  </tr>
                </thead>
                <tbody>
                {getSortedStudents.map((student, i) => (
                    <tr key={i} onClick={() => handleStudentClicked(student.id)} className={"hover:bg-accent transition-colors cursor-pointer"}>
                      <td className="px-4 py-2 border-b break-all text-red-500">
                        {getEmptyTasks.some(task => task.studentId === student.id) ? (
                          <Tooltip>
                            <TooltipTrigger><IoAlert/></TooltipTrigger>
                            <TooltipContent side={"right"}>
                              <p>This student has missing task data!</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : ""}
                      </td>
                      <td className="px-4 py-2 border-b break-all">{student.id}</td>
                      <td className="px-4 py-2 border-b break-all">{student.name}</td>
                      <td className="px-4 py-2 border-b break-all text-center">{student.class_id}</td>
                    </tr>
                ))}
                </tbody>
              </table>
            </div>
          )
        )
      }
    </div>
  );
};

export default HomePage;