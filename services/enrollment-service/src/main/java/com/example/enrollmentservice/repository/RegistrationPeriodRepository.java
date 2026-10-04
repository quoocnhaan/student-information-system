package com.example.enrollmentservice.repository;

import com.example.enrollmentservice.entity.RegistrationPeriod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RegistrationPeriodRepository extends JpaRepository<RegistrationPeriod, String> {
}
