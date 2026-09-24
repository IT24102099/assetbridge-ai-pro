# ADR 0002: Stateless JWT Authentication & Role-Based Access Control

## Status
Accepted

## Context
The system serves distinct client types: React web applications (Managers/Admins) and Flutter mobile apps (Owners, Reps, Providers). We need a unified authentication model that scales across diverse clients without relying on server-side session state.

## Decision
We implement JSON Web Token (JWT) Bearer authentication using HMAC-SHA256 signature and BCrypt password hashing (12 work factor). Standardized claims (`sub`, `email`, `role`, `name`) are embedded in the token.

## Consequences
- **Positive:** Stateless authentication simplifies scaling and decouples web/mobile clients from sticky server sessions.
- **Positive:** Uniform role-based authorization policies (`[Authorize(Roles = ...)]`) protect sensitive operations across all platforms.
- **Negative:** Token revocation prior to expiration requires token blacklisting or short expiration windows (24h default configured).
