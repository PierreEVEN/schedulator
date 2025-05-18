# User
    - id
    - email
    - display_name
    - password

# SlotKind (type)
    - Unavailable
    - Available

# Planning
    - id
    - title
    - start
    - end
    - time_precision
    - start_daily_hour
    - end_daily_hour

# PlanningUser
    - id
    - name
    - planning_id
    - user_id (optional)

# Slot
    - id
    - planning_id
    - name
    - planning_user_id
    - start
    - end

