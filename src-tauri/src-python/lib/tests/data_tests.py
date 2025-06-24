import unittest
import numpy as np

from sklearn.metrics import r2_score
from lib.src.processes.db import DB
from lib.src.processes.ml import calculate_mark, check_consistency_percent, calculate_mark_on_rank
from lib.src.processes.regression import smape
from lib.src.struct.students import Student
from sklearn.model_selection import train_test_split
import random

"""
This file contains tests for the DB class and its methods. Including tests for generating marks.
"""
class TestDB(unittest.TestCase):
    def setUp(self):
        self.db = DB("./students_marks.csv")

    def test_initiation(self):
        """
        Test to ensure the DB class is initialized properly
        """
        assert len(self.db) >= 0

    def test_update(self):
        """
        Test to ensure the DB class is updated properly
        """

        s = self.db.get_with_id(1).unwrap()
        s._name = "hmm"
        self.db.update_student(s, False)

        # Test to see if the name is synced
        s._name = "hmm2"
        assert self.db.get_with_id(1).unwrap()._name == "hmm"

    def test_rank(self):
        """
        Test to ensure that the students rank works as expected
        """

        s = Student(-1, "Test", "Test", 5, (100, 100, 100, 100))
        assert self.db.get_student_rank_task(s, 3).unwrap() == 1

        # Test to ensure that the student rank for average works as expected
        print(calculate_mark_on_rank(self.db, 200, 1).unwrap())
        print(self.db.get_student_rank_avg(self.db.get_with_id(199).unwrap()))

    def test_validate_data(self):
        """
        Test to ensure that the data is valid and consistent. Contains debug print statements to help identify issues.
        This test will randomly select 20% of the data, generate a mark for each student, and then calculate the error.
        """

        # Split data into two parts: one with test data and the other with valid data
        # Randomly select 20% of the data for testing.
        # For each student pick a random task to generate a mark for and then calculate the error

        train_df, test_df = train_test_split(self.db._file, test_size=0.2, random_state=42)
        errors = []
        old = []
        new = []

        for idx, (_, row) in enumerate(test_df.iterrows()):
            task_id = random.randint(1, 4)
            student_obj: Student = Student.from_row(row)
            old_mark = student_obj.get_task(task_id)
            print(f"Testing student: {row['Student']}, Task: {task_id}, {idx + 1}/{len(test_df)}")

            student_obj.update_mark(task_id, None, override=True)
            calculated_mark = calculate_mark(self.db, student_obj, task_id)

            # Check % error
            if calculated_mark.is_ok():
                new_mark = calculated_mark.unwrap()
                if old_mark is not None:
                    smape_error = smape(old_mark, new_mark)
                    errors.append(smape_error)
                    print(f"Old mark: {old_mark}, New mark: {new_mark}, SMAPE Error: {smape_error:.2f}%")
                    print("Marks: " + str([f"{task_id}: {student_obj.get_task(task_id)}" for task_id in range(1, 5)]))
                    old.append(old_mark)
                    new.append(new_mark)


            else:
                assert False, f"Error calculating mark for student {student_obj.get_name()}: {calculated_mark.unwrap_err()}"
            print()

        # Calculate average error
        avg_error = sum(errors) / len(errors)
        print(f"Average error: {avg_error:.2f}%")
        print(f"Max error: {max(errors):.2f}%")
        print(f"Min error: {min(errors):.2f}%")

        # R2 score of the old vs new marks
        r2 = r2_score(old, new)
        print(f"R2 Score: {r2:.2f}")

    def test_consistency(self):
        assert check_consistency_percent([10, 10, 10, 10], 5).unwrap() == True
        assert check_consistency_percent([10, 12, 11, 12], 20).unwrap() == True
        assert check_consistency_percent([10, 12, 11, 15], 50).unwrap() == False


if __name__ == '__main__':
    unittest.main()