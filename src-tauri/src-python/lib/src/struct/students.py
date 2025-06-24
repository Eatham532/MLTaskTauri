from lib.src.processes.utils import Result, Ok, Err
import math


class Student:
    def __init__(self, id:int, name: str, _class:str, epa: float, tasks:(int|None,int|None,int|None,int|None)) -> None:
        self._id = id
        self._name = name
        self._epa = epa
        self._tasks = tasks
        self._class = _class

    @staticmethod
    def from_row(r) -> "Student":
       """
       Create a Student instance from a DataFrame row.

       Args:
           r: A row from a DataFrame containing student data.

       Returns:
           Student: An instance of the Student class.
       """

       def to_none(val):
           return None if (val is None or (isinstance(val, float) and math.isnan(val))) else val

       return Student(
           r["id"],
           r["Student"],
           r["Class"],
           r["EPA Score"],
           [to_none(r["Task 1"]), to_none(r["Task 2"]), to_none(r["Task 3"]), to_none(r["Task 4"])])

    def calc_average(self, none_is_0:bool=False) -> float:
        if none_is_0:
            return sum(self._tasks) / len(self._tasks)

        filtered = [item for item in self._tasks if item is not None]
        return sum(filtered) / len(filtered)

    def get_task(self, num:int) -> int|None:
        return self._tasks[num-1]

    def get_all_tasks(self) -> ():
        return self._tasks

    def update_mark(self, task_id:int, new:int, override=False) -> Result:
        if self._tasks[task_id-1] is None or override == True:
            self._tasks[task_id-1] = new
            return Ok()
        return Err("Task value already exists. Ignoring.")

    def get_id(self):
        return self._id

    def get_name(self) -> str:
        return self._name

    def get_class(self) -> int:
        return self._class

    def get_epa(self) -> float:
        return self._epa

    def __str__(self) -> str:
        return f'Student: {self._name}\n Class: {self._name}'
