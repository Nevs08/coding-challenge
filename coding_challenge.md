# Applicant Coding Challenge

## Introduction
Welcome to our coding challenge! The goal of this task is to evaluate your problem-solving skills and coding abilities. Please read the requirements carefully and submit your solution as described below.

## Task
You are tasked with planning an optimal drone operation for surveying 35 sugar beet fields. The specific requirements are:

1. The drone must survey multiple fields, whose coordinates are provided in the attached file. Assume that each field is a square with a side length of **200m** and the center is the coordinate given.
2. Determine the **optimal location for the drone dock**, preferably near a farm, and compute the **optimal flight route** with regards to time of flight.
3. Consider the following constraints:
   - The drone flies **at 15 m/s** between fields.
   - Each field takes **10 minutes** to survey.
   - The drone has a **maximum flight time of 40 minutes** before it needs to return to the dock.
   - The drone requires **35 minutes of charging** before it can resume flights.

## Expected Implementation
- Implement a Python (or other preferred language) program to **compute the optimal dock location and flight path**.
- The program should read the field coordinates from the input file.
- Use an appropriate algorithm to minimize total operation time while ensuring all constraints are met.
- Provide a visualization (e.g., using Matplotlib or another library) to illustrate the flight path and dock location.
- Handle edge cases such as disconnected fields or infeasible operations.

## Example Input
A sample file (`fields.txt`) might contain:
```
52.123, 13.456
52.124, 13.457
52.125, 13.458
...
```

## Submission
- Provide a GitHub repository or a ZIP file containing your solution.
- Include a README explaining your approach and any assumptions made.
- The code should be well-documented and formatted according to Python (or other preferred language) best practices.

## Evaluation Criteria
- Correctness and feasibility of the solution
- Code readability and structure
- Efficiency and performance
- Proper handling of constraints

Good luck! We are excited to review your solution! 🚀