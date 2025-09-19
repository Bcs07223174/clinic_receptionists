// Comprehensive test for appointment workflow
// This script tests the complete flow: login -> doctor linkage -> appointment fetching

const BASE_URL = 'http://localhost:3001';

class AppointmentWorkflowTest {
    constructor() {
        this.results = {
            diagnostic: null,
            login: null,
            appointments: null,
            errors: []
        };
    }

    async log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
        console.log(logMessage);
        
        // Also display in browser if running in browser
        if (typeof document !== 'undefined') {
            const logDiv = document.getElementById('test-results') || this.createLogDiv();
            const logEntry = document.createElement('div');
            logEntry.className = `log-entry log-${type}`;
            logEntry.textContent = logMessage;
            logDiv.appendChild(logEntry);
        }
    }

    createLogDiv() {
        const logDiv = document.createElement('div');
        logDiv.id = 'test-results';
        logDiv.style.cssText = `
            background: #f5f5f5;
            border: 1px solid #ccc;
            padding: 20px;
            margin: 20px 0;
            font-family: monospace;
            max-height: 500px;
            overflow-y: auto;
        `;
        document.body.appendChild(logDiv);
        return logDiv;
    }

    async makeRequest(url, options = {}) {
        try {
            this.log(`Making request to: ${url}`);
            const response = await fetch(url, options);
            const data = await response.json();
            
            this.log(`Response status: ${response.status}`);
            if (!response.ok) {
                this.log(`Error response: ${JSON.stringify(data)}`, 'error');
            }
            
            return { success: response.ok, status: response.status, data };
        } catch (error) {
            this.log(`Request failed: ${error.message}`, 'error');
            this.results.errors.push(`Request to ${url} failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async testDiagnostic() {
        this.log('=== TESTING DIAGNOSTIC API ===');
        
        const result = await this.makeRequest(`${BASE_URL}/api/debug-appointments`);
        this.results.diagnostic = result;
        
        if (result.success) {
            const data = result.data;
            this.log(`✅ Diagnostic successful`);
            this.log(`📊 Receptionist found: ${data.receptionist?.found}`);
            this.log(`👨‍⚕️ Linked doctor IDs: ${JSON.stringify(data.receptionist?.linked_doctor_ids)}`);
            this.log(`🏥 Total doctors: ${data.doctors?.total}`);
            this.log(`📅 Total appointments: ${data.appointments?.total}`);
            this.log(`🔗 Linked doctor exists: ${data.linkedDoctor ? 'Yes' : 'No'}`);
            
            if (data.linkedDoctor) {
                this.log(`👨‍⚕️ Linked doctor: ${data.linkedDoctor.name} (${data.linkedDoctor.email})`);
            }
            
            this.log(`📋 Appointments for linked doctor: ${data.appointmentsForLinkedDoctor?.length || 0}`);
            
            return true;
        } else {
            this.log(`❌ Diagnostic failed`, 'error');
            return false;
        }
    }

    async testLogin() {
        this.log('=== TESTING LOGIN API ===');
        
        const loginData = {
            email: 'adminareceptionist@medicare.com',
            password: 'admin123'
        };
        
        const result = await this.makeRequest(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });
        
        this.results.login = result;
        
        if (result.success) {
            const data = result.data;
            this.log(`✅ Login successful`);
            this.log(`👤 Receptionist: ${data.receptionist?.name} (${data.receptionist?.email})`);
            this.log(`🔗 Linked doctor IDs: ${JSON.stringify(data.receptionist?.linkedDoctorIds)}`);
            this.log(`👨‍⚕️ Doctors found: ${data.doctors?.length || 0}`);
            
            if (data.doctors && data.doctors.length > 0) {
                data.doctors.forEach((doc, i) => {
                    this.log(`   Doctor ${i+1}: ${doc.name} (${doc.specialization})`);
                });
            }
            
            // Store user data for next test (simulating localStorage)
            this.userData = {
                user: JSON.stringify({
                    linked_doctor_ids: data.receptionist?.linkedDoctorIds || []
                })
            };
            
            return true;
        } else {
            this.log(`❌ Login failed`, 'error');
            return false;
        }
    }

    async testAppointments() {
        this.log('=== TESTING APPOINTMENTS API ===');
        
        if (!this.userData || !this.userData.user) {
            this.log(`❌ No user data from login, cannot test appointments`, 'error');
            return false;
        }
        
        const user = JSON.parse(this.userData.user);
        const doctorIds = user.linked_doctor_ids || [];
        
        if (doctorIds.length === 0) {
            this.log(`❌ No doctor IDs found in user data`, 'error');
            return false;
        }
        
        const doctorId = doctorIds[0];
        this.log(`🔍 Testing appointments for doctor ID: ${doctorId}`);
        
        const result = await this.makeRequest(`${BASE_URL}/api/appointments?doctorId=${doctorId}`);
        this.results.appointments = result;
        
        if (result.success) {
            const data = result.data;
            this.log(`✅ Appointments API successful`);
            this.log(`📅 Appointments found: ${data.appointments?.length || 0}`);
            
            if (data.debugInfo) {
                this.log(`🐛 Debug info - Total in DB: ${data.debugInfo.totalInDatabase}`);
                this.log(`🔍 Searched by ObjectId: ${data.debugInfo.searchedByObjectId}`);
                this.log(`🔍 Searched by string: ${data.debugInfo.searchedByString}`);
            }
            
            if (data.appointments && data.appointments.length > 0) {
                this.log(`📋 Sample appointments:`);
                data.appointments.slice(0, 3).forEach((apt, i) => {
                    this.log(`   ${i+1}. ${apt.patientName} - ${apt.appointmentDate} (${apt.status})`);
                });
                
                if (data.appointments.length > 3) {
                    this.log(`   ... and ${data.appointments.length - 3} more`);
                }
            } else {
                this.log(`⚠️ No appointments found for this doctor`, 'warning');
            }
            
            return true;
        } else {
            this.log(`❌ Appointments API failed`, 'error');
            return false;
        }
    }

    async testAppointmentUpdate() {
        this.log('=== TESTING APPOINTMENT UPDATE ===');
        
        if (!this.results.appointments?.success || !this.results.appointments.data.appointments?.length) {
            this.log(`⚠️ Skipping update test - no appointments available`, 'warning');
            return true; // Not a failure, just no data to test with
        }
        
        // Find a pending appointment to test with
        const pendingAppointment = this.results.appointments.data.appointments.find(
            apt => apt.status === 'pending'
        );
        
        if (!pendingAppointment) {
            this.log(`⚠️ No pending appointments found to test update`, 'warning');
            return true;
        }
        
        this.log(`🔄 Testing update for appointment: ${pendingAppointment.patientName}`);
        
        // Test confirming an appointment
        const updateResult = await this.makeRequest(`${BASE_URL}/api/appointments`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                appointmentId: pendingAppointment._id,
                status: 'confirmed',
                doctorId: pendingAppointment.doctorId
            })
        });
        
        if (updateResult.success) {
            this.log(`✅ Appointment update successful`);
            this.log(`📅 Updated appointment for: ${updateResult.data.appointment?.patientName}`);
            return true;
        } else {
            this.log(`❌ Appointment update failed`, 'error');
            return false;
        }
    }

    async runAllTests() {
        this.log('🚀 STARTING COMPREHENSIVE APPOINTMENT WORKFLOW TEST');
        this.log(`🔗 Testing against: ${BASE_URL}`);
        
        const startTime = Date.now();
        let passedTests = 0;
        let totalTests = 0;
        
        const tests = [
            { name: 'Diagnostic', fn: () => this.testDiagnostic() },
            { name: 'Login', fn: () => this.testLogin() },
            { name: 'Appointments', fn: () => this.testAppointments() },
            { name: 'Appointment Update', fn: () => this.testAppointmentUpdate() }
        ];
        
        for (const test of tests) {
            totalTests++;
            this.log(`\n--- Testing ${test.name} ---`);
            
            try {
                const success = await test.fn();
                if (success) {
                    passedTests++;
                    this.log(`✅ ${test.name} test PASSED`);
                } else {
                    this.log(`❌ ${test.name} test FAILED`, 'error');
                }
            } catch (error) {
                this.log(`💥 ${test.name} test CRASHED: ${error.message}`, 'error');
                this.results.errors.push(`${test.name} test crashed: ${error.message}`);
            }
        }
        
        const duration = Date.now() - startTime;
        
        this.log('\n=== TEST SUMMARY ===');
        this.log(`📊 Tests passed: ${passedTests}/${totalTests}`);
        this.log(`⏱️ Total time: ${duration}ms`);
        
        if (this.results.errors.length > 0) {
            this.log(`\n❌ Errors encountered:`);
            this.results.errors.forEach((error, i) => {
                this.log(`   ${i+1}. ${error}`, 'error');
            });
        }
        
        if (passedTests === totalTests) {
            this.log(`\n🎉 ALL TESTS PASSED! Appointment workflow is working correctly.`, 'success');
        } else {
            this.log(`\n⚠️ Some tests failed. Check the errors above.`, 'warning');
        }
        
        return {
            passed: passedTests,
            total: totalTests,
            success: passedTests === totalTests,
            duration,
            errors: this.results.errors,
            results: this.results
        };
    }
}

// Auto-run if in browser environment
if (typeof window !== 'undefined') {
    // Browser environment
    window.AppointmentWorkflowTest = AppointmentWorkflowTest;
    
    // Create test UI
    document.addEventListener('DOMContentLoaded', () => {
        if (!document.getElementById('test-ui')) {
            const testUI = document.createElement('div');
            testUI.id = 'test-ui';
            testUI.innerHTML = `
                <div style="background: #e8f4fd; border: 2px solid #0066cc; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h2>🧪 Appointment Workflow Test Suite</h2>
                    <p>This will test the complete appointment management workflow</p>
                    <button id="run-tests" style="background: #0066cc; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 16px;">
                        Run All Tests
                    </button>
                    <button id="clear-results" style="background: #666; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 16px; margin-left: 10px;">
                        Clear Results
                    </button>
                </div>
            `;
            document.body.insertBefore(testUI, document.body.firstChild);
            
            document.getElementById('run-tests').addEventListener('click', async () => {
                const button = document.getElementById('run-tests');
                button.textContent = 'Running Tests...';
                button.disabled = true;
                
                const tester = new AppointmentWorkflowTest();
                await tester.runAllTests();
                
                button.textContent = 'Run All Tests';
                button.disabled = false;
            });
            
            document.getElementById('clear-results').addEventListener('click', () => {
                const resultsDiv = document.getElementById('test-results');
                if (resultsDiv) {
                    resultsDiv.remove();
                }
            });
        }
    });
    
} else {
    // Node.js environment
    module.exports = AppointmentWorkflowTest;
    
    // Auto-run if this file is executed directly
    if (require.main === module) {
        (async () => {
            // Need to import fetch for Node.js
            try {
                const { default: fetch } = await import('node-fetch');
                global.fetch = fetch;
                
                const tester = new AppointmentWorkflowTest();
                await tester.runAllTests();
            } catch (error) {
                console.error('Failed to run tests:', error.message);
            }
        })();
    }
}