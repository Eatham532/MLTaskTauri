from sklearn.linear_model import LinearRegression
import numpy as np
import matplotlib.pyplot as plt

def linear_regression_1d(x: list, y: list, predict: list, plot: bool = False) -> list:
    """
    Perform linear regression to predict a value based on input features.

    Args:
        x (list): List of input features.
        y (list): List of target values.
        predict (list): List of values to predict.
        plot (bool): Plot the regression as a graph

    Returns:
        list: Predicted values.
    """
    x = np.array(x).reshape(-1, 1)
    predict = np.array(predict).reshape(-1, 1)

    model = LinearRegression()
    model.fit(x, y)
    result = model.predict(predict).tolist()

    if plot:
        plt.scatter(x, y, color='blue', label='Training data')
        # Plot regression line
        x_line = np.linspace(min(x), max(x), 100).reshape(-1, 1)
        y_line = model.predict(x_line)
        plt.plot(x_line, y_line, color='red', label='Regression line')
        # Plot prediction point(s)
        plt.scatter(predict, result, color='green', marker='x', s=100, label='Prediction')
        plt.xlabel('X')
        plt.ylabel('Y')
        plt.legend()
        plt.title('Linear Regression: Rank vs Mark')
        plt.show()

    return result

def smape(y_true, y_pred) -> float:
    """
    Calculate the Symmetric Mean Absolute Percentage Error (SMAPE) between true and predicted values.
    SMAPE is a measure of accuracy based on percentage errors.

    Args:
        y_true: True values.
        y_pred: Predicted values.

    Returns:
        float: SMAPE value as a percentage.
    """
    denominator = (abs(y_true) + abs(y_pred)) / 2
    if denominator == 0:
        return 0.0
    return abs(y_true - y_pred) / denominator * 100
