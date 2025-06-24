import numpy as np
import math

from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score
from lib.src.processes.db import DB
from lib.src.processes.regression import linear_regression_1d, smape
from lib.src.processes.utils import Result, Ok, Err
from lib.src.struct.students import Student

def calculate_mark(db: DB, student: Student, task_id: int) -> Result:
    """
    Calculate the mark for a student based on their rank and EPA.

    Args:
        db: DB instance containing student data.
        student: Student object for whom the mark is to be calculated.
        task_id: The ID of the task for which the mark is to be calculated.

    Returns:
        Result (OK): The calculated mark for the student.
        Result (Err): An error message if the rank is inconsistent or if there are no marks for the task.

    """
    try:
        ranks = [db.get_student_rank_task(student, t).unwrap() for t in range(1, 5) if t is not task_id]
    except Exception as e:
        return Err(f"Error computing ranks: {e}")

    epa = student.get_epa()

    avg_mark = calculate_mark_on_rank(db, db.get_student_rank_avg(student), task_id).unwrap()
    regression_rank = int(linear_regression_1d([t for t in range(1, 5) if t is not task_id], ranks,
                                                                [task_id])[0])
    regression_mark_rank = np.clip((calculate_mark_on_rank(db, regression_rank, task_id).unwrap_or(-1)), 1, len(db) + 1)
    regression_mark_epa = calculate_mark_on_epa(db, epa, task_id).unwrap()
    regression_mark_epa_class = calculate_mark_on_epa(db, epa, task_id, int(student.get_class())).unwrap()


    # Print debugging information
    print(f"Debug Info: Ranks: {ranks}, Avg Mark: {avg_mark},Regression Rank: {regression_rank}, "
            f"Regression Mark Rank: {regression_mark_rank}, Regression Mark EPA: {regression_mark_epa}, {regression_mark_epa_class}")
    print(f"EPA: {epa}")

    # First check if the students rank is consistent +- 5%
    if check_consistency_percent(ranks, 10).unwrap():
        print(3)
        return Ok(avg_mark)
    else:
        # Check to see if the rank trend is consistent
        trend = check_trend(ranks, 20).unwrap()
        if trend != () and regression_mark_rank != -1:
            print(4)
            print(f"Trend: {trend}")

            _tasks = [t for t in range(1, 5) if t is not task_id]
            y_pred = linear_regression_1d(_tasks, ranks, _tasks)
            r2 = r2_score(ranks, y_pred)
            print(f"R2 Score: {r2}")

            # 1 for rank decreasing, -1 for rank increasing (As 1 is the highest rank)
            if (epa <= 3.5 and trend == 1) or (epa >= 1.5 and trend == -1):
                print(5)
                return Ok(regression_mark_rank)


            print(6)
            return Ok(regression_mark_epa)
        else:
            print(7)
            if abs(ranks[0] - ranks[-1])/len(db)*100 <= 10:
                print(8)
                return Ok(avg_mark)
            return Ok(regression_mark_epa_class)


def calculate_mark_on_epa(db: DB, epa: float, task_id: int, _c: int | None = None) -> Result:
    """
    Calculate the mark for a student based on their EPA and task ID.

    Args:
        db: DB instance containing student data.
        epa: The EPA score of the student.
        task_id: The ID of the task for which the mark is to be calculated.
        _c (int, None): Optional class ID to filter students by class. None if not filtering.
    Returns:
        Result (OK): The calculated mark for the student based on EPA.
        Result (Err): An error message if the EPA is out of bounds or if there are no marks for the task.

    """
    task_marks = db.get_marks_for_task(task_id, _c).unwrap()
    students = db.get_all(_c, include_invalid=False).unwrap()

    if not task_marks:
        return Err("No marks found for the specified task.")

    if epa < 0 or epa > 5:
        return Err("EPA must be between 0 and 5.")

    marks = [i.get_task(task_id) for i in students if i.get_task(task_id) is not None]
    epas = [i.get_epa() for i in students]

    predict = linear_regression_1d(epas, marks, [epa])

    return Ok(int(predict[0]))


def calculate_mark_on_rank(db: DB, rank: int, task_id: int) -> Result:
    """
    Calculate the mark for a student based on their rank and task ID.

    Args:
        db: DB instance containing student data.
        rank: The rank of the student.
        task_id: The ID of the task for which the mark is to be calculated.

    Returns:
        Result (OK): The calculated mark for the student at the given rank.
        Result (Err): An error message if the rank is out of bounds or if there are no marks for the task.

    """

    task_marks = db.get_marks_for_task(task_id).unwrap()
    task_sorted_marks = sorted(task_marks, reverse=True)

    if rank < 1 or rank > len(task_marks):
        return Err("Rank is out of bounds for the number of students.")

    # Get the mark for the student at the given rank
    # This is done by finding the highest mark and the lowest mark around this rank and averaging them
    # First check if the rank is the lowest or highest

    if rank == 1 or rank == len(task_marks):
        ranks = [db.get_student_rank_task(student, task_id).unwrap() for student in db.get_all().unwrap()]

        predict = linear_regression_1d(ranks, task_marks, [rank])
        new_mark = predict[0]

    else:
        # Get the marks around the rank and calculate the average
        lower_mark = task_sorted_marks[rank - 2]  # Rank is 1-based, so we need to adjust index
        upper_mark = task_sorted_marks[rank - 1]
        new_mark = (lower_mark + upper_mark) / 2

    return Ok(int(new_mark))


def check_trend(ranks_sorted: list[float|int], threshold: float) -> Result:
    """
    Checks if the ranks are consistently increasing or decreasing within a given threshold.
    By averaging the difference between the first and last rank, we can determine if the trend is consistent.

    Args:
        ranks_sorted: A list of sorted ranks (either ascending or descending).
        threshold: The maximum allowed difference between consecutive ranks to consider them consistent.

    Returns:
        Result: Ok(1) if ranks are consistently increasing, Ok(-1) if consistently decreasing,
                Ok() if no consistent trend is found, or Err if not enough ranks are provided.
    """

    if len(ranks_sorted) < 2:
        return Err("Not enough ranks to evaluate trend consistency")

    # Calculate the average difference between the first and last rank
    avg_diff = (ranks_sorted[-1] - ranks_sorted[0]) / (len(ranks_sorted) - 1)

    # Check if the average difference is within the threshold
    if threshold >= avg_diff >= 0:
        return Ok(1)
    elif -threshold <= avg_diff < 0:
        return Ok(-1)
    else:
        return Ok()



def check_consistency_range(ranks: list[float|int], tolerance:int) -> Result:
    """
    Checks if the ranks are consistent within a given tolerance range.

    Args:
        ranks: A list of ranks (integers or floats).
        tolerance: Tolerance value to determine if the ranks are consistent.

    Returns:
        Result: Ok(True) if ranks are consistent within the tolerance, Ok(False) otherwise,
        or Err if not enough ranks are provided.
    """
    if len(ranks) < 2:
        return Err("Not enough tasks to evaluate rank consistency")
    if max(ranks) - min(ranks) <= tolerance:
        return Ok(True)
    else:
        return Ok(False)


def check_consistency_percent(numbers: list[float | int], tolerance_percent: int|float) -> Result:
    """
    Checks if all numbers in a list are consistent within a given percentage tolerance
    from their mean.

    Args:
        numbers: A list of floats or integers.
        tolerance_percent: The maximum allowed percentage deviation from the mean
                           for each number to be considered consistent.

    Returns:
        True if all numbers are within the specified tolerance, False otherwise.
        Returns Err if there are not enough numbers.
    """

    if len(numbers) < 2:
        return Err("Not enough numbers to calculate consistency. Need at least 2 numbers.")

    mean_value: float = float(np.mean(numbers))

    if mean_value == 0:
        return Err("Mean value is zero, cannot calculate percentage deviation.")

    for num in numbers:
        deviation = abs(num - mean_value)
        percentage_deviation = (deviation / mean_value) * 100

        if percentage_deviation > tolerance_percent:
            return Ok(False)


    return Ok(True)

