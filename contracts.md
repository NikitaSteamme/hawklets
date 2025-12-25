# Hawklets Landing Page - API Contracts

## Backend Implementation Plan

### Data Model

**Waitlist Collection**
```python
{
  "id": "uuid",
  "name": "string (optional)",
  "email": "string (required, unique)",
  "created_at": "datetime",
  "status": "string (default: 'pending')"
}
```

### API Endpoints

#### 1. POST /api/waitlist
**Purpose**: Add user to waitlist

**Request Body**:
```json
{
  "name": "John Doe",  // optional
  "email": "john@example.com"  // required
}
```

**Response Success (201)**:
```json
{
  "success": true,
  "message": "Successfully added to waitlist",
  "data": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

**Response Error (400)**:
```json
{
  "success": false,
  "message": "Email already registered" | "Invalid email format"
}
```

#### 2. GET /api/waitlist (Optional - Admin endpoint)
**Purpose**: Retrieve all waitlist entries

**Response Success (200)**:
```json
{
  "success": true,
  "count": 100,
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

### Frontend Integration

**Current Mock Implementation**:
- Located in: `/app/frontend/src/components/Home.jsx`
- Function: `handleWaitlistSubmit`
- Currently uses: `setTimeout` with mock toast notification
- Mock data storage: None (just UI feedback)

**Backend Integration Changes**:
1. Replace mock `setTimeout` with actual API call to `POST /api/waitlist`
2. Use axios for HTTP requests (already installed)
3. Handle success/error responses with toast notifications
4. Clear form on success
5. Show appropriate error messages on failure

**Frontend Code Changes Required**:
```javascript
const handleWaitlistSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    const response = await axios.post(`${API}/waitlist`, {
      name: name || undefined,
      email: email
    });
    
    toast({
      title: "You're on the list!",
      description: "We'll notify you when Hawklets launches.",
    });
    
    setEmail('');
    setName('');
  } catch (error) {
    toast({
      title: "Error",
      description: error.response?.data?.message || "Something went wrong. Please try again.",
      variant: "destructive"
    });
  } finally {
    setLoading(false);
  }
};
```

### Backend Implementation Checklist

- [ ] Create Pydantic models for waitlist (WaitlistCreate, Waitlist)
- [ ] Add POST /api/waitlist endpoint
- [ ] Add GET /api/waitlist endpoint (optional)
- [ ] Add email validation
- [ ] Add duplicate email check
- [ ] Test endpoints with curl
- [ ] Update frontend to use real API
- [ ] Test end-to-end flow

### Database Schema

**MongoDB Collection**: `waitlist`

**Indexes**:
- email (unique)
- created_at (for sorting)

### Error Handling

Backend should handle:
- Invalid email format
- Duplicate emails
- Missing required fields
- Database connection errors

Frontend should display:
- Success toast on successful submission
- Error toast with specific message on failure
- Loading state during submission
