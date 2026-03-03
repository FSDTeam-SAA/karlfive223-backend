# Team Member Change Feature - Documentation

## Overview
This feature allows team captains to change team members (either the captain/user or the player) with automatic validation of the new member's subscription status.

## Key Features

### 1. **Change Team Member Endpoint**
- **Route**: `PATCH /api/teams/change-member/:id`
- **Authentication**: Required (player, manager, or admin role)
- **Validation**: Zod schema validation

### 2. **Security & Authorization**
- ✅ Only the team captain (user) can change team members
- ✅ Prevents changing members after the league has started
- ✅ Validates that new members are not already on the team
- ✅ Requires active subscription for new members

### 3. **Subscription Validation**
Similar to the team creation process, the system checks if the new member has:
- An active subscription (type: 'subscription')
- Status: 'success'
- Expiry date is in the future (not expired)

## API Documentation

### Request
```http
PATCH /api/teams/change-member/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "memberType": "user" | "player",
  "newMemberEmail": "newemail@example.com"
}
```

### Request Parameters
- **Path Parameters**:
  - `id`: Team ID (MongoDB ObjectId)

- **Body Parameters**:
  - `memberType`: Type of member to change
    - `"user"` - Changes the team captain/user
    - `"player"` - Changes the co-player/partner
  - `newMemberEmail`: Email address of the new team member

### Response Examples

#### Success Response (200)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Successfully changed player to John Doe",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "user": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Captain Name",
      "email": "captain@example.com",
      "role": "player"
    },
    "player": {
      "_id": "507f1f77bcf86cd799439013",
      "name": "John Doe",
      "email": "newemail@example.com",
      "role": "player"
    },
    "teamName": "Team Alpha",
    "captainName": "Captain Name",
    "partnerName": "John Doe",
    "playerLevels": "3.5",
    "email": "captain@example.com",
    "contactNumber": "+1234567890",
    "logoPhotoUrl": "https://cloudinary.com/...",
    "league": {
      "_id": "507f1f77bcf86cd799439014",
      "leagueName": "Summer League 2026",
      "leagueLogo": "https://cloudinary.com/...",
      "location": "New York",
      "startDate": "2026-03-15T00:00:00.000Z"
    },
    "agreedToRules": true,
    "confirmedAvailability": true,
    "applicationStatus": "pending",
    "createdAt": "2026-03-01T00:00:00.000Z",
    "updatedAt": "2026-03-03T00:00:00.000Z"
  }
}
```

#### Error Responses

**400 - Validation Error**
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Member type must be either 'user' or 'player'"
}
```

**400 - Already Member**
```json
{
  "statusCode": 400,
  "success": false,
  "message": "This user is already a member of this team"
}
```

**400 - League Started**
```json
{
  "statusCode": 400,
  "success": false,
  "message": "League has already started. You cannot change team members after the league has begun."
}
```

**402 - No Active Subscription**
```json
{
  "statusCode": 402,
  "success": false,
  "message": "John Doe (newemail@example.com) must have an active subscription to be added to the team"
}
```

**403 - Unauthorized**
```json
{
  "statusCode": 403,
  "success": false,
  "message": "Only the team captain can change team members"
}
```

**404 - Team Not Found**
```json
{
  "statusCode": 404,
  "success": false,
  "message": "Team not found"
}
```

**404 - User Not Found**
```json
{
  "statusCode": 404,
  "success": false,
  "message": "User with email newemail@example.com not found"
}
```

## Business Logic

### Validation Flow
1. **Input Validation**: Validates request body using Zod schema
2. **Team Existence**: Checks if team exists
3. **Authorization**: Verifies requester is the team captain
4. **League Status**: Ensures league hasn't started yet
5. **New Member Existence**: Verifies new member exists in the system
6. **Duplicate Check**: Ensures new member isn't already on the team
7. **Subscription Check**: Validates new member has active subscription
8. **Update Operation**: Updates team member and related fields

### Automatic Field Updates

When changing the **captain (user)**:
- `user`: Updated to new member's ID
- `email`: Updated to new member's email
- `captainName`: Updated to new member's name

When changing the **player**:
- `player`: Updated to new member's ID
- `partnerName`: Updated to new member's name

## Testing Guide

### Test Case 1: Change Player Successfully
```bash
curl -X PATCH http://localhost:3000/api/teams/change-member/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "memberType": "player",
    "newMemberEmail": "newplayer@example.com"
  }'
```

### Test Case 2: Change Captain Successfully
```bash
curl -X PATCH http://localhost:3000/api/teams/change-member/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "memberType": "user",
    "newMemberEmail": "newcaptain@example.com"
  }'
```

### Test Case 3: Invalid Member Type
```bash
curl -X PATCH http://localhost:3000/api/teams/change-member/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "memberType": "coach",
    "newMemberEmail": "test@example.com"
  }'
```
Expected: 400 error with validation message

### Test Case 4: No Active Subscription
```bash
curl -X PATCH http://localhost:3000/api/teams/change-member/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "memberType": "player",
    "newMemberEmail": "userwithoutsub@example.com"
  }'
```
Expected: 402 error indicating subscription required

### Test Case 5: Non-Captain Attempts Change
Login as a different user (not the team captain) and attempt to change members.
Expected: 403 Forbidden error

## Implementation Files

### Modified Files
1. **team.service.ts** - Added `changeTeamMember` function
2. **team.controller.ts** - Added `changeTeamMember` controller
3. **team.routes.ts** - Added new route with validation
4. **team.valadetion.ts** - Created validation schema

### Code Structure
```
src/app/module/team/
├── team.model.ts (unchanged)
├── team.interface.ts (unchanged)
├── team.service.ts (modified - added changeTeamMember)
├── team.controller.ts (modified - added changeTeamMember)
├── team.routes.ts (modified - added route)
└── team.valadetion.ts (modified - added validation)
```

## Database Queries

### Subscription Check Query
```javascript
await Payment.findOne({
  userId: newMember._id,
  type: 'subscription',
  status: 'success',
  expiryDate: { $gte: currentDateStart }
});
```

This query ensures the new member has:
- A payment record linked to their user ID
- Type is 'subscription' (not a league payment)
- Status is 'success' (payment completed)
- Expiry date is today or in the future

## Security Considerations

1. **Authentication**: All requests must be authenticated
2. **Authorization**: Only team captains can change members
3. **Temporal Validation**: Changes blocked after league starts
4. **Financial Validation**: Subscription verification prevents unpaid members
5. **Data Integrity**: Prevents duplicate members on same team

## Future Enhancements

Possible improvements:
1. Add notification system to inform old and new members
2. Add audit log for member changes
3. Add team history to track changes
4. Allow admin override for emergency changes
5. Add bulk member change functionality
6. Implement member change approval workflow

## Support & Troubleshooting

### Common Issues

**Issue**: "Only the team captain can change team members"
- **Solution**: Ensure the authenticated user is the team captain (user field in team)

**Issue**: "User must have an active subscription"
- **Solution**: New member needs to purchase a subscription first
- Check Payment collection for active subscription record

**Issue**: "League has already started"
- **Solution**: Member changes are not allowed after league start date
- Contact admin for special circumstances

**Issue**: "This user is already a member of this team"
- **Solution**: Cannot add same user twice to a team
- Verify the email address of the new member

---

## Quick Reference

### Endpoint
`PATCH /api/teams/change-member/:id`

### Required Headers
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

### Request Body
```json
{
  "memberType": "user" | "player",
  "newMemberEmail": "email@example.com"
}
```

### Success Status Code
`200 OK`

### Error Status Codes
- `400` - Bad Request (validation, already member, league started)
- `402` - Payment Required (no active subscription)
- `403` - Forbidden (not team captain)
- `404` - Not Found (team or user not found)
- `500` - Internal Server Error
