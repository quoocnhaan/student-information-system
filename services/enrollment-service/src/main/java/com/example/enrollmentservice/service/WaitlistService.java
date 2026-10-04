package com.example.enrollmentservice.service;

import com.example.enrollmentservice.entity.Waitlist;
import com.example.enrollmentservice.repository.WaitlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WaitlistService {
    private final WaitlistRepository waitlistRepository;

    public List<Waitlist> getAllWaitlists() { return waitlistRepository.findAll(); }
    public Waitlist getWaitlistById(String id) { return waitlistRepository.findById(id).orElse(null); }
    public Waitlist saveWaitlist(Waitlist waitlist) { return waitlistRepository.save(waitlist); }
    public void deleteWaitlist(String id) { waitlistRepository.deleteById(id); }
}
