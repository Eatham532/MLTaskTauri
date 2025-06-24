import sys
from typing import Union, TypeVar, Any, Coroutine

from anyio.from_thread import start_blocking_portal
from pydantic import BaseModel, RootModel
from pytauri import (
    Commands,
    builder_factory,
    context_factory, Manager, App, AppHandle,
)
from pytauri.ffi.path import PathResolver
from pytauri.ffi.webview import WebviewWindow

from lib.src.processes.ml import calculate_mark
from lib.src.struct.students import Student
from lib.src.processes.db import DB
from mltasktauri.store import Store

commands: Commands = Commands()


AppStore: Store | None = None
appdata_dir = ""


def get_app_store() -> Store:
    """
    Get the global application store.
    """
    global AppStore
    if AppStore is None:
        raise ValueError("AppStore is not initialized.")
    return AppStore

def main() -> int:
    global AppStore
    global appdata_dir


    with start_blocking_portal("asyncio") as portal:  # or `trio`
        app = builder_factory().build(
            context=context_factory(),
            invoke_handler=commands.generate_handler(portal),
        )
        path_resolver: PathResolver = Manager.path(app)

        appdata_dir = path_resolver.app_data_dir()
        AppStore = Store(appdata_dir)

        exit_code = app.run_return()

        return exit_code


class PYStudent(BaseModel):
    id: int
    name: str
    class_id: int
    epa: float
    tasks: list[int | None]

    @staticmethod
    def from_student(student: Student) -> "PYStudent":
        return PYStudent(
            id=student.get_id(),
            name=student.get_name(),
            class_id=student.get_class(),
            epa=student.get_epa(),
            tasks=student.get_all_tasks(),
        )

def init_commands(_commands: Commands):
    @_commands.command()
    async def get_students() -> RootModel[list[PYStudent]]:
        """
        Get all students in the database.
        """

        database = DB(get_app_store().get_value("fileLocation"))
        students = database.get_all().unwrap()


        return RootModel([PYStudent.from_student(s) for s in students])

    class GetStudentByIdBody(BaseModel):
        student_id: int

    @commands.command()
    async def get_student_by_id(body: GetStudentByIdBody) -> RootModel[PYStudent | None]:
        """
        Get a student by ID.
        """
        database = DB(get_app_store().get_value("fileLocation"))
        student = database.get_with_id(body.student_id).unwrap()
        if student is None:
            return RootModel(None)
        return RootModel(PYStudent.from_student(student))

    @_commands.command("get_path")
    async def get_appdata_path() -> RootModel[str]:
        _store = get_app_store()
        return RootModel(_store.get_path())

    class GenerateMarkBody(BaseModel):
        student_id: int
        task_id: int

    @_commands.command()
    async def generate_mark_for_task(body: GenerateMarkBody) -> RootModel[int]:
        """
        Get marks for a specific task across all students.

        Args:
            body (GenerateMarkBody): Contains student_id and task_id.

        Returns:
            int: The calculated mark for the student on the specified task.
        """
        database = DB(get_app_store().get_value("fileLocation"))
        student = database.get_with_id(body.student_id).unwrap()
        new_mark = calculate_mark(database, student, body.task_id).unwrap()

        print("Generated mark:", new_mark)

        return RootModel(new_mark)

    class SetStudentMarkBody(BaseModel):
        student_id: int
        task_id: int
        mark: int

    @_commands.command()
    async def set_student_mark(body: SetStudentMarkBody) -> bytes:
        """
        Set a student's mark for a specific task.
        """
        database = DB(get_app_store().get_value("fileLocation"))
        student = database.get_with_id(body.student_id).unwrap()
        if student is None:
            return b"null"

        student.update_mark(body.task_id, body.mark, override=True)

        database.update_student(student)

        return b"null"

    class GetDataKeyBody(BaseModel):
        key: str

    @commands.command()
    async def check_students_with_missing_tasks() -> RootModel[list[PYStudent]]:
        """
        Get all students with missing tasks.
        """
        database = DB(get_app_store().get_value("fileLocation"))
        students = database.get_all_with_missing_tasks().unwrap()
        return RootModel([PYStudent.from_student(s) for s in students])

    @_commands.command()
    async def get_data_key(body: GetDataKeyBody) -> RootModel[Any]:
        """
        Get a value from the application store by key.
        """
        _store = get_app_store()
        value = _store.get_value(body.key)
        return RootModel(value)

    class SetDataKeyBody(BaseModel):
        key: str
        value: Any

    @_commands.command()
    async def set_data_key(body: SetDataKeyBody) -> bytes:
        """
        Get a value from the application store by key.
        """
        _store = get_app_store()
        _store.set_value(body.key, body.value)
        return b"null"

init_commands(commands)