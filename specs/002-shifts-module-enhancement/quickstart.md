# Quickstart: Shifts Module Enhancement

## Overview

The shifts module enhancement adds admin oversight capabilities and dashboard quick actions for shift management. This guide covers verification of the implemented features.

## Prerequisites

### Environment Setup
```bash
# Ensure you have access to:
- React development server running
- Supabase database with res_shifts table
- Clerk authentication configured
- Admin user account with 'shifts' permission
```

### Test Data Requirements
```sql
-- Ensure you have at least one admin user
-- Ensure res_employees table has employee records
-- Ensure res_shifts table has some historical data
```

## Feature Verification

### 1. Admin Shift Overview

**Steps**:
1. Login as admin user
2. Navigate to `/respos/shifts`
3. Verify "All Shifts" section shows
4. Check that employee names appear in the table
5. Confirm balance calculations are displayed with color coding

**Expected Results**:
- ✅ Table header shows "Employee" column
- ✅ Employee names display as "First Last"
- ✅ Balance column shows positive/negative amounts
- ✅ Green text for positive balances, red for negative

### 2. Previous Shift Balance Display

**Steps**:
1. Login as admin user
2. Navigate to `/respos/shifts`
3. Click "Open New Shift" button
4. Observe the modal content

**Expected Results**:
- ✅ Shows "Previous Shift Closing Cash: $X.XX"
- ✅ Shows "Previous Shift Balance: $X.XX" (with color)
- ✅ Opening cash field pre-filled with previous closing amount

### 3. Dashboard Quick Actions

**Steps**:
1. Login as admin user
2. Navigate to `/respos/dashboard`
3. Check shift status in welcome section

**Expected Results**:
- ✅ When no active shift: Shows "Open Shift" button
- ✅ When active shift: Shows "Shift Active" indicator with close button
- ✅ Close button triggers close shift modal

### 4. Real-time Variance Calculation

**Steps**:
1. Open a shift (from dashboard or shifts page)
2. Navigate to shifts page
3. Click "Close Shift" button
4. Type in closing cash amount

**Expected Results**:
- ✅ Variance updates as you type
- ✅ Color coding: green for positive, red for negative
- ✅ Shows "Variance: $X.XX" label

## Manual Testing Scenarios

### Admin User Testing

```bash
# Scenario 1: View all shifts
1. Login as admin
2. Go to /respos/shifts
3. Verify all users' shifts are visible
4. Check employee name display
5. Verify balance calculations

# Scenario 2: Open shift with previous data
1. Ensure a closed shift exists
2. Click "Open New Shift"
3. Verify previous shift data is shown
4. Confirm opening cash is pre-filled
5. Complete shift opening

# Scenario 3: Dashboard operations
1. Go to /respos/dashboard
2. Click "Open Shift" button
3. Verify same modal as shifts page
4. Open and then close shift from dashboard
```

### Regular User Testing

```bash
# Scenario: Limited view
1. Login as regular user (cashier role)
2. Go to /respos/shifts
3. Verify only own shifts are visible
4. Confirm "Open New Shift" button is disabled
5. Check "Shift History" title (not "All Shifts")
```

## Automated Testing

### Unit Tests
```bash
# Test balance calculation
npm test -- --testPathPattern=shifts-balance.test.ts

# Test employee name display
npm test -- --testPathPattern=shifts-employee.test.ts

# Test form validation
npm test -- --testPathPattern=shifts-validation.test.ts
```

### Integration Tests
```bash
# Test shift workflow
npm test -- --testPathPattern=shifts-workflow.test.ts

# Test API queries
npm test -- --testPathPattern=shifts-api.test.ts

# Test dashboard integration
npm test -- --testPathPattern=dashboard-shifts.test.ts
```

## Performance Verification

### Load Testing
```bash
# Verify page load time < 2 seconds
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:3000/respos/shifts"

# Check query performance
# Monitor network tab for API response times
```

### Memory Testing
```bash
# Verify no memory leaks in shift operations
# Monitor browser dev tools memory tab during:
# - Opening/closing shifts
# - Switching between admin/user views
# - Dashboard interactions
```

## Edge Case Testing

### Error Scenarios
1. **Try to open shift when one exists**
   - Expected: Error message or disabled button

2. **Invalid cash amounts**
   - Expected: Form validation prevents submission

3. **Network disconnection**
   - Expected: Offline support via IndexedDB

4. **Permission issues**
   - Expected: Regular users cannot open shifts

### Data Edge Cases
1. **Zero opening cash**
   - Expected: Allowed, balance calculation works

2. **Missing employee data**
   - Expected: Shows "—" instead of employee name

3. **Null closing cash on closed shifts**
   - Expected: Balance shows as "—"

## Browser Compatibility

### Supported Browsers
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Mobile Testing
- ✅ iOS Safari 14+
- ✅ Chrome Android 90+
- ✅ Samsung Internet 15+

## Troubleshooting

### Common Issues

**Employee names not showing**:
```bash
# Check database relations
SELECT s.id, e.first_name, e.last_name
FROM res_shifts s
LEFT JOIN res_employees e ON s.opened_by = e.id
LIMIT 5;
```

**Balance calculations wrong**:
```bash
# Verify calculation logic
SELECT id, opening_cash, closing_cash,
       (closing_cash - opening_cash) as balance
FROM res_shifts
WHERE status = 'closed'
LIMIT 5;
```

**Dashboard buttons not working**:
```bash
# Check user permissions
# Verify Clerk authentication
# Check browser console for errors
```

### Debug Commands

```bash
# Clear cache and restart
npm run dev -- --force

# Check database connectivity
# Verify Supabase environment variables

# Test API endpoints directly
curl -H "Authorization: Bearer $TOKEN" \
     "https://your-project.supabase.co/rest/v1/res_shifts"
```

## Deployment Checklist

- [ ] Admin permissions configured correctly
- [ ] Database relations established
- [ ] Employee data populated
- [ ] Historical shift data exists for testing
- [ ] Environment variables set
- [ ] SSL certificates valid
- [ ] CDN configured for assets

## Support Contacts

- **Technical Issues**: Development team
- **Data Issues**: Database administrator
- **Permission Issues**: System administrator

---

**Version**: 1.0.0
**Last Updated**: 2026-03-29
**Tested On**: React 19, Supabase, Clerk