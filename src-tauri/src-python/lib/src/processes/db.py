import pandas as pd
from copy import deepcopy

from pandas import DataFrame

from lib.src.processes.utils import *
from lib.src.struct.students import Student


class DB:
    def __init__(self, path: str):
        """
        Initialize database connection with file path.

        Args:
            path: File path to CSV database

        Raises:
            FileNotFoundError: If the specified file doesn't exist
        """
        self._path = path
        self._objects = []
        self._file: DataFrame | None = None
        if path:
            self.load().unwrap()

    def load(self) -> Result:
        """
        Load student data from CSV file into memory.

        Returns:
            Result[None, Exception]: Success if loaded, Error if file not found
        """
        try:
            self._file = pd.read_csv(self._path)
        except FileNotFoundError as e:
            return Err(e)

        self._objects = []
        for _, r in self._file.iterrows():
            self._objects.append(Student.from_row(r))

        self._objects.sort(key=lambda o: o.get_id())
        return Ok()

    def __len__(self):
        """
        Get number of students in database.

        Returns:
            int: Number of student records
        """
        return len(self._objects)

    def get_path(self) -> str:
        """
        Get the current database file path.

        Returns:
            str: Absolute path to database file
        """
        return self._path

    def update_path(self, path: str) -> None:
        """
        Update the database file path.

        Args:
            path: New file path to CSV database
        """
        self._path = path
        self.load().unwrap()

    def get_all(self, _c: int | None = None, include_invalid: bool = True) -> Result:
        """
        Retrieve all student records.

        Returns:
            Result[List[Student], str]: List of Student objects if found, Error message if not found
        """
        if not self._objects:
            return Err("No students found")
        students = [o for o in self._objects if o.get_class() == _c] if _c is not None else self._objects
        invalid_students = self.get_all_with_missing_tasks().unwrap_or([])

        # Filter out invalid students if include_invalid is False
        if not include_invalid:
            students = [s for s in students if s not in invalid_students]
        return Ok(students)

    def get_marks_for_task(self, task: int, _c: int | None = None, include_none: bool = False) -> Result:
        """
        Retrieve marks for a specific task across all students.

        Args:
            task: Task number (1-4)
            _c: Optional class identifier to filter students by class. If None, all classes are included.

        Returns:
            Result[List[int], str]: List of marks for the specified task if found, Error message if not found
        """
        if not self._objects:
            return Err("No students found")

        marks = [o.get_task(task) for o in self._objects if (o.get_class() == _c or _c is None)
                 and (o.get_task(task) is not None or include_none)]
        if not marks:
            return Err(f"No marks found for Task {task}")

        return Ok(marks)

    def get_with_id(self, _id: int) -> Result:
        """
        Retrieve a student record by ID.

        Args:
            _id: Student identifier

        Returns:
            Result[Student, str]: Student object if found, Error message if not found
        """
        for o in self._objects:
            if o.get_id() == _id:
                return Ok(deepcopy(o))
        return Err(f"{_id} not found")

    def get_all_with_missing_tasks(self) -> Result:
        """
        Get all students with missing tasks.

        Returns:
            Result[List[Student], str]: List of Student objects with missing tasks if found, Error message if not found
        """
        if not self._objects:
            return Err("No students found")

        missing_tasks = [s for s in self._objects if any(t is None for t in s.get_all_tasks())]
        if not missing_tasks:
            return Err("No students with missing tasks found")

        return Ok(missing_tasks)

    def update_df(self):
        """
        Update DataFrame from current Student objects and save to CSV.

        This method synchronizes the DataFrame with the current state of Student objects
        and persists the changes to disk.
        """
        if not self._objects:
            return

        # Convert Student objects back to dictionary format
        data = [
            {
                "id": student.get_id(),
                "Student": student.get_name(),
                "Class": student.get_class(),
                "EPA Score": student.get_epa(),
                "Task 1": student.get_task(1),
                "Task 2": student.get_task(2),
                "Task 3": student.get_task(3),
                "Task 4": student.get_task(4)
            }
            for student in self._objects
        ]

        # Create new DataFrame and sort by ID
        self._file = pd.DataFrame(data).sort_values("id")
        pd.DataFrame(self._file).to_csv(self._path, index=False)

    def update_student(self, student: Student, save=True) -> None:
        """
        Update student record in memory and optionally persist to file.
        If the student does not exist, add them.

        Args:
            student: Updated Student object
            save: Whether to save changes to CSV file

        """
        old = next((i for i, obj in enumerate(self._objects) if obj.get_id() == student.get_id()), None)
        if old is None:
            self._objects.append(deepcopy(student))
        else:
            self._objects[old] = deepcopy(student)
        self._file = pd.DataFrame(self._objects)
        if save:
            self.update_df()

    def student_exists(self, student: Student) -> bool:
        """
        Check if a student exists in the database.

        Args:
            student: Student object to check

        Returns:
            bool: True if student exists, False otherwise
        """
        return any(o.get_id() == student.get_id() for o in self._objects)

    def get_student_rank_avg(self, student: Student) -> int:
        """
        Calculate student rank for average mark

        Args:
            student (Student): Student object

        Returns:
            int: Student rank rounded up
        """

        import math

        list_avg = [x for x in self._objects if x.get_id() != student.get_id()]
        list_avg.sort(key=lambda o: o.calc_average())

        avg = student.calc_average()

        for i, s in enumerate(list_avg):
            if s.calc_average() >= avg:
                return math.ceil(len(self) - i)

        return 1

    def get_lowest_rank_task(self, task: int) -> Result:
        """
        Get the lowest rank for a specific task across all students.

        Args:
            task (int): Task number

        Returns:
            Result[float, str]: Lowest rank for the specified task if found, Error message if not found
        """
        marks = [x.get_task(task) for x in self._objects]
        if not marks:
            return Err(f"No marks found for Task {task}")

        sorted_marks = sorted(set(marks), reverse=True)
        if not sorted_marks:
            return Err(f"No unique marks found for Task {task}")

        lowest_rank = len(sorted_marks)
        return Ok(lowest_rank)

    def get_student_rank_task(self, student: Student, task: int) -> Result:
        """
        Calculate student rank on a specific task

        Args:
            student (Student): Student object
            task (int): Task number

        Returns:
            int: Student rank
        """

        # Find the student's mark
        student_mark = student.get_task(task)

        if student_mark is None: return Err(f"Student doesn't have a mark for task {task}")

        # Get all marks for the task, including the student's
        marks = [x.get_task(task) for x in self._objects]
        # Sort in descending order (higher marks = better rank)
        sorted_marks = sorted(marks, reverse=True)

        # Rank is 1-based index in sorted unique marks
        try:
            rank = sorted_marks.index(student_mark) + 1
        except ValueError:
            marks.append(student_mark)
            sorted_marks = sorted(set(marks), reverse=True)
            rank = sorted_marks.index(student_mark) + 1
        return Ok(rank)

    def get_next_id(self) -> int:
        """
        Generate the next available unique student ID.

        Returns:
            int: The next available student ID (max existing ID + 1, or 1 if no students exist)
        """
        if not self._objects:
            return 1
        return max(o.get_id() for o in self._objects) + 1