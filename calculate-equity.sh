#!/usr/bin/env

skypager hands --dev --babel --players 2
skypager hands --dev --babel --players 3
skypager hands --dev --babel --players 4
skypager hands --dev --babel --players 5
skypager hands --dev --babel --players 6
skypager hands --dev --babel --players 7
skypager hands --dev --babel --players 8
skypager hands --dev --babel --players 9

# do a few more cycles
skypager hands --dev --babel --players 2
skypager hands --dev --babel --players 3
skypager hands --dev --babel --players 4
skypager hands --dev --babel --players 5
skypager hands --dev --babel --players 6
skypager hands --dev --babel --players 7
skypager hands --dev --babel --players 8
skypager hands --dev --babel --players 9

# do a few more cycles
skypager hands --dev --babel --players 2
skypager hands --dev --babel --players 3
skypager hands --dev --babel --players 4
skypager hands --dev --babel --players 5
skypager hands --dev --babel --players 6
skypager hands --dev --babel --players 7
skypager hands --dev --babel --players 8
skypager hands --dev --babel --players 9

# seed the db with the results
skypager seed --dev --babel
