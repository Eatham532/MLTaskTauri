import React, { useEffect, useState } from "react";
import {useNavigate} from "react-router";
import { pyInvoke } from "tauri-plugin-pytauri-api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Input } from "@/components/ui/input.tsx";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IoReloadOutline, IoAlert } from "react-icons/io5";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Student } from "@/lib/types.ts";

import {
  ColumnDef, ColumnFiltersState,
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState,
  useReactTable,
} from "@tanstack/react-table"

import { DataTable } from "@/components/ui/data-table.tsx";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { DataTablePagination } from "@/components/ui/data-table-pagination.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {updateStudent as updateDBStudent } from "@/lib/utils.ts";

type HomePageProps = {
  csvPath: string;
};


const columns: ColumnDef<Student>[] = [
  {
    id: "has_empty_tasks",
    accessorFn: (row) => row.tasks.some(task => task === "" || task === null || task === undefined),
    header: ({ column }) => {
      const sortDirection = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          size={"icon"}
          onClick={() => column.toggleSorting(sortDirection === "asc")}
        >
          {sortDirection === "asc" ? (
            <ArrowUp className="h-4 w-4" />
          ) : sortDirection === "desc" ? (
            <ArrowDown className="h-4 w-4" />
          ) : (
            <ArrowUpDown className="h-4 w-4" />
          )}
        </Button>
      );
    },
    cell: ({ row }) => {
      const hasEmptyTasks = row.getValue("has_empty_tasks") as boolean;
      return hasEmptyTasks ? (
        <Tooltip>
          <TooltipTrigger>
            <Button size={"icon"} variant={"link"}>
              <IoAlert className="text-red-500 h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            This student has tasks with no marks set.
          </TooltipContent>
        </Tooltip>
      ) : (
        <div className={"h-9 w-9"}/>
      );
    },
    filterFn: (row, _columnId, filterValue) => {
      const hasEmptyTasks = row.getValue("has_empty_tasks") as boolean;

      if (filterValue === "true") return hasEmptyTasks;
      if (filterValue === "false") return !hasEmptyTasks;

      if (typeof filterValue === "boolean") return filterValue ? hasEmptyTasks : !hasEmptyTasks;

      return true;
    },
  },
  {
    accessorKey: "id",
    header: ({ column }) => {
      const sortDirection = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(sortDirection === "asc")}
        >
          ID
          {sortDirection === "asc" ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : sortDirection === "desc" ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      );
    },
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      const sortDirection = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(sortDirection === "asc")}
        >
          Name
          {sortDirection === "asc" ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : sortDirection === "desc" ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      );
    },
  },
  {
    accessorKey: "class_id",
    header: ({ column }) => {
      const sortDirection = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(sortDirection === "asc")}
        >
          Class ID
          {sortDirection === "asc" ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : sortDirection === "desc" ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      );
    },
  },
];

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  class_id: z.string().min(1, "Class ID is required"),
  epa: z.string().min(1, "EPA is required"),
  task1: z.string().optional(),
  task2: z.string().optional(),
  task3: z.string().optional(),
  task4: z.string().optional(),
});

const HomePage: React.FC<HomePageProps> = ({ csvPath }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [students, setStudents] = useState<Student[]>([]);
  const [filterBy, setFilterBy] = useState("id");
  const [searchQuery, setSearchQuery] = useState("");

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      class_id: "",
      epa: "",
      task1: "",
      task2: "",
      task3: "",
      task4: "",
    },
  });

  const table = useReactTable({
    data: students,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  useEffect(() => {
    if (
      searchQuery === "" ||
      (filterBy === "has_empty_tasks" && searchQuery === "any")
    ) {
      table.getColumn(filterBy)?.setFilterValue("");
    } else if (filterBy === "has_empty_tasks") {
      if (
        searchQuery.toLowerCase() === "true" ||
        searchQuery.toLowerCase() === "yes"
      ) {
        table.getColumn(filterBy)?.setFilterValue("true");
      } else if (
        searchQuery.toLowerCase() === "false" ||
        searchQuery.toLowerCase() === "no"
      ) {
        table.getColumn(filterBy)?.setFilterValue("false");
      }
    } else {
      table.getColumn(filterBy)?.setFilterValue(searchQuery);
    }
  }, [filterBy, searchQuery, table]);

  useEffect(() => {
    if (csvPath) {
      updateStudents();
    }
  }, [csvPath]);

  const updateStudents = async () => {
    setLoading(true);
    try {
      const s = await pyInvoke<Student[]>("get_students", { csvPath });
      if (s) {
        setStudents(s);

        // Toast for students with missing tasks
        const studentsWithMissing = s.filter(stu =>
          stu.tasks.some(task => task === "" || task === null || task === undefined)
        );
        if (studentsWithMissing.length > 0) {
          toast("Some students have missing tasks!", {
            description: `${studentsWithMissing.length} students have missing tasks.`,
            action: {
              label: "Show",
              onClick: () => {
                setFilterBy("has_empty_tasks");
                setSearchQuery("true");
              },
            },
          });
        }
      }
    } catch (error) {
      toast.error("Failed to load students");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (addDialogOpen) {
      form.reset();
    }
  }, [addDialogOpen, form]);

  const handleAddStudent = async (values: z.infer<typeof formSchema>) => {
    try {
      const newStudent: Student = {
        id: -1,
        name: values.name,
        class_id: Number(values.class_id),
        tasks: [
          values.task1 && values.task1 !== "" ? Number(values.task1) : null,
          values.task2 && values.task2 !== "" ? Number(values.task2) : null,
          values.task3 && values.task3 !== "" ? Number(values.task3) : null,
          values.task4 && values.task4 !== "" ? Number(values.task4) : null,
        ],
        epa: Number(values.epa),
      };

      await updateDBStudent(newStudent);
      await updateStudents();
      setAddDialogOpen(false);
      toast.success("Student added!");
    } catch (e) {
      console.log(e);
      toast.error("Failed to add student");
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full overflow-hidden p-2">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
        <div className="flex flex-row gap-2 items-center">
          <Button
            variant="outline"
            onClick={() => setAddDialogOpen(true)}
          >
            Add Student
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={updateStudents}
            className="shrink-0"
          >
            <IoReloadOutline />
          </Button>
        </div>
        <div className="flex flex-col gap-4 w-full md:w-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            {filterBy === "has_empty_tasks" ? (
              <Select
                value={searchQuery}
                onValueChange={(value) => setSearchQuery(value)}
              >
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Select filter value" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="true">Yes (Has empty tasks)</SelectItem>
                  <SelectItem value="false">No (All tasks complete)</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full sm:w-64"
                placeholder={`Query by ${filterBy}...`}
              />
            )}

            <div className="flex items-center gap-2">
              <Label className="whitespace-nowrap">Filter by:</Label>
              <Select
                value={filterBy}
                onValueChange={(value) => {
                  setFilterBy(value);
                  setSearchQuery(value === "has_empty_tasks" ? "any" : "");
                }}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="id">ID</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="class_id">Class</SelectItem>
                  <SelectItem value="has_empty_tasks">Empty Tasks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        students.length === 0 ? (
          <div className="text-muted-foreground">No students found.</div>
        ) : (
          <div className="flex flex-col h-full justify-between overflow-x-auto gap-5">
            <div className="overflow-x-auto scroll pr-1">
              <DataTable
                columns={columns}
                data={students}
                table={table}
                onRowClick={(row) => navigate(`/student/${row.original.id}`)}
                rowClassName="cursor-pointer hover:bg-accent/20"
              />
            </div>
            <DataTablePagination table={table} />
          </div>
        )
      )}

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Student</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleAddStudent)}
              className="flex flex-col gap-4"
              autoComplete="off"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Student Name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="class_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class ID</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Class ID"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="epa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>EPA</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={5}
                        step={0.1}
                        placeholder="EPA"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="task1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task 1 Mark</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Task 1"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="task2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task 2 Mark</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Task 2"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="task3"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task 3 Mark</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Task 3"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="task4"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task 4 Mark</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Task 4"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddDialogOpen(false)}
                  disabled={form.formState.isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                >
                  Add
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HomePage;

