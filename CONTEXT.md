# StrideVolt

StrideVolt is an invite-only training coach for endurance athletes. It builds a plan around each athlete's week from the training data they keep in Intervals.icu.

## Language

### Joining

**Athlete**:
A person with a StrideVolt account who trains with it.
_Avoid_: User, customer, member

**Admin**:
The operator who reviews Access requests and decides who may join.
_Avoid_: Moderator, owner

**Access request**:
A prospective Athlete's request, by email, to join StrideVolt. It is pending, approved or rejected, and a rejected request can still be approved later.
_Avoid_: Registration, sign-up, waitlist entry

**Approval**:
The Admin's decision to grant an Access request, which is what lets the requester become an Athlete.
_Avoid_: Validation, activation

**Invite**:
The email sent after Approval that lets the requester prove they own the address and choose a password, completing their account.
_Avoid_: Verification link, confirmation email

### Getting started

**Onboarding**:
The steps an Athlete goes through once, after choosing a password and before reaching the dashboard: Availability and Sports are required, and the Intervals connection can be skipped.
_Avoid_: Setup, wizard

**Availability**:
The weekly days and time slots an Athlete can commit to training.
_Avoid_: Schedule, calendar

**Intervals connection**:
An Athlete's authorization for StrideVolt to act on their Intervals.icu account. It is optional: an Athlete can use StrideVolt without one and connect later. An Intervals.icu account can belong to at most one Athlete.
_Avoid_: Sync, integration, API key

**Intervals.icu athlete**:
The account on Intervals.icu that an Intervals connection points to. It is distinct from a StrideVolt Athlete even though both use the word "athlete".
_Avoid_: Intervals user

**Sync**:
Reserved for importing training data from Intervals.icu into StrideVolt. That doesn't exist yet. Making an Intervals connection is not a Sync.
