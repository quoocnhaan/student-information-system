package com.example.enrollmentservice.repository;

import com.example.enrollmentservice.entity.Waitlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WaitlistRepository extends JpaRepository<Waitlist, String> {
}
