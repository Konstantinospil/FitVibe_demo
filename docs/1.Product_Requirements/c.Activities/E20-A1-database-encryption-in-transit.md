# E20-A1: Database Encryption in Transit

---

**Activity ID**: E20-A1  
**Epic ID**: [E20](../b.Epics/E20-database-encryption.md)  
**Title**: Database Encryption in Transit  
**Status**: Open  
**Difficulty**: 2  
**Estimated Effort**: 3 story points  
**Created**: 2025-12-21  
**Updated**: 2025-12-21

---

## Description

Implement TLS/SSL encryption for all database connections to ensure data is encrypted in transit. Configure PostgreSQL SSL connections with proper certificate verification in production while allowing relaxed settings for development environments.

## Implementation Details

1. **Update Database Configuration**:
   - Modify `apps/backend/src/db/db.config.ts` to support secure SSL configuration
   - Add environment variables for SSL certificates (CA, cert, key paths)
   - Implement environment-specific SSL configuration (strict in prod, relaxed in dev)

2. **Update Knex Configuration**:
   - Modify `apps/backend/src/db/knexfile.ts` to include SSL configuration for all environments
   - Ensure production requires certificate verification

3. **PostgreSQL SSL Setup**:
   - Configure PostgreSQL server to accept SSL connections
   - Generate or obtain SSL certificates (CA, server cert, server key)
   - Update Docker/Kubernetes configurations to support SSL

4. **Environment Variables**:
   - Add `PGSSL=true` for enabling SSL
   - Add `PGSSLMODE=require` or `verify-full` for production
   - Add `PGSSL_CA`, `PGSSL_CERT`, `PGSSL_KEY` for certificate paths (optional, for mutual TLS)

5. **Documentation**:
   - Update deployment guides with SSL setup instructions
   - Document certificate management and rotation procedures

## Acceptance Criteria

- Database connection configuration supports SSL with certificate verification in production
- Development environments can use relaxed SSL (self-signed certificates)
- Environment variables control SSL configuration
- All database connections use TLS 1.3 (minimum TLS 1.2) in production
- SSL connection failures are logged with appropriate error messages
- Tests verify SSL configuration works correctly
- Documentation updated with SSL setup instructions

## Dependencies

### Blocking Dependencies

- None

### Non-Blocking Dependencies

- [E20-A2: Database Encryption at Rest](../c.Activities/E20-A2-database-encryption-at-rest.md): Can work in parallel

## Related User Stories

- [US-20.1: Database SSL/TLS Configuration](../d.User_stories/US-20.1-database-ssl-tls-configuration.md)

## Technical Notes

- Use Node.js `pg` library SSL configuration options
- Follow PostgreSQL SSL documentation for certificate setup
- Consider using managed database services (RDS, Cloud SQL) that provide SSL by default
- Ensure certificate rotation is handled according to KEY_MANAGEMENT_POLICY.md

## Test Strategy

- Unit tests for SSL configuration parsing
- Integration tests for SSL connection establishment
- Test SSL connection failures and error handling
- Test environment-specific SSL configurations
- Verify certificate verification works correctly

## Definition of Done

- [ ] Code implemented and reviewed
- [ ] SSL configuration supports production and development environments
- [ ] Tests written and passing (≥80% coverage)
- [ ] Documentation updated with SSL setup instructions
- [ ] Environment variables documented
- [ ] Acceptance criteria met
- [ ] Related user stories updated

---

**Last Updated**: 2025-12-21  
**Next Review**: 2026-01-21
