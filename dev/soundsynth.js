/***************************************************************/
/* SFXDef is a class used to define a sound effect to generate */
/***************************************************************/
var SFXDef = /** @class */ (function () {
    function SFXDef() {
        this.waveType = 'square';
        this.frequency = 0;
        this.frequencySlide = 0;
        this.delayFrequencyStartTimePct = 0;
        this.delayFrequencyMult = 0;
        this.vibratoTime = 0;
        this.vibratoShiftTime = 0;
        this.vibratoFrequency = 0;
        this.vibratoWave = "sine";
        this.lowPassFrequency = 0;
        this.lowPassFrequencyRamp = 0;
        this.hiPassFrequency = 0;
        this.attackTime = 0;
        this.decayTime = 0;
        this.sustainTime = 0;
        this.releaseTime = 0;
        this.attackPunchVolume = 0; // I THINK THIS WILL NEED TO BE CHANGED TO ATTACK PUNCH
        this.dutyCycleLength = 1;
        this.dutyCyclePct = 0.5;
        this.flangeDelayTime = 0.01;
        this.flangeFeedbackVolume = 0.3;
        this.gain = 1;
        this.distortion = 0;
        this.noiseDetune = 0;
        this.noiseDetuneSlide = 0;
        this.slideType = "linear";
    }
    return SFXDef;
}());
/***************************************************************/
/* Created by Rick Battagline at embed limited.  www.embed.com */
/***************************************************************/
window.AudioContext = window.AudioContext ||
    window.webkitAudioContext ||
    window.mozAudioContext ||
    window.oAudioContext ||
    window.msAudioContext;
/*************************************************************/
/* SFXWeb is a class used to generate sound effects in       */
/* during game play                                          */
/*************************************************************/
var SFXWeb = /** @class */ (function () {
    function SFXWeb() {
        var _this = this;
        this.masterVolume = 1;
        this.SetDef = function (def) {
            _this.def = def;
        };
        /*************************************************************/
        /* Play a sound based on the definition, or if no definition */
        /* is passed in, play the last definition used.              */
        /*************************************************************/
        this.PlaySound = function (def) {
            if (def === void 0) { def = null; }
            if (def != null) {
                _this.def = def;
            }
            var context = SFXWeb.ACTX;
            var time = _this.def.attackTime + _this.def.decayTime + _this.def.sustainTime + _this.def.releaseTime;
            // noise waveType does not use a oscillator, but generates random noise in a sound buffer.
            if (_this.def.waveType == 'noise') {
                var noise_buffer = _this.Noise();
                noise_buffer.detune.setValueAtTime(_this.def.noiseDetune * 100, context.currentTime);
                noise_buffer.detune.linearRampToValueAtTime(_this.def.noiseDetuneSlide * 100, context.currentTime + time);
                var gain_node = context.createGain();
                gain_node.gain.setValueAtTime(_this.def.gain, context.currentTime);
                noise_buffer.connect(gain_node);
                var audio = gain_node;
                if (_this.def.hiPassFrequency > 0) {
                    audio = _this.HighPassFilter(_this.def.hiPassFrequency, time, audio);
                }
                if (_this.def.lowPassFrequency > 0) {
                    audio = _this.LowPassFilter(_this.def.lowPassFrequency, time, audio, _this.def.lowPassFrequencyRamp);
                }
                if (_this.def.dutyCycleLength > 0) {
                    var duty_cycle = _this.DutyCycle(_this.def.dutyCycleLength, _this.def.dutyCyclePct, time);
                    audio.connect(duty_cycle);
                    audio = duty_cycle;
                }
                var flange = null;
                if (_this.def.flangeDelayTime > 0) {
                    flange = _this.Flange(_this.def.flangeDelayTime, _this.def.flangeFeedbackVolume, audio);
                    flange.connect(audio);
                    //  NOT SURE THIS IS RIGHT... THIS WASN'T HERE
                    audio = flange;
                }
                if (_this.def.vibratoTime > 0) {
                    var vibrato_gain = _this.Vibrato(SFXWeb.GET_OSC_FROM_STRING(_this.def.vibratoWave), _this.def.vibratoFrequency, _this.def.vibratoShiftTime * time, _this.def.vibratoTime * time);
                    audio.connect(vibrato_gain);
                    audio = vibrato_gain;
                }
                var envelope = _this.Envelope(_this.def.attackTime, _this.def.decayTime, _this.def.sustainTime, _this.def.releaseTime, _this.def.attackPunchVolume);
                audio.connect(envelope);
                var master_volume_gain = context.createGain();
                master_volume_gain.gain.value = _this.masterVolume;
                envelope.connect(master_volume_gain);
                master_volume_gain.connect(context.destination);
                noise_buffer.start();
                noise_buffer.stop(context.currentTime + time);
                return;
            }
            var osc_type = SFXWeb.GET_OSC_FROM_STRING(_this.def.waveType);
            var tone = _this.OscillatorTone(_this.def.frequency, osc_type);
            var audio = tone;
            if (_this.def.frequencySlide != 0) {
                if (_this.def.delayFrequencyStartTimePct != 0) {
                    _this.FrequencySlide(_this.def.frequencySlide, _this.def.delayFrequencyStartTimePct, tone);
                    _this.DelayedFrequencySlide(_this.def.frequencySlide, _this.def.delayFrequencyMult, _this.def.delayFrequencyStartTimePct, time, tone);
                }
                else {
                    _this.FrequencySlide(_this.def.frequencySlide, time, tone);
                }
            }
            else if (_this.def.delayFrequencyStartTimePct != 0) {
                _this.DelayedFrequencySlide(_this.def.frequency, _this.def.delayFrequencyMult, _this.def.delayFrequencyStartTimePct, time, tone);
            }
            if (_this.def.hiPassFrequency > 0) {
                audio = _this.HighPassFilter(_this.def.hiPassFrequency, time, tone);
            }
            if (_this.def.lowPassFrequency > 0) {
                audio = _this.LowPassFilter(_this.def.lowPassFrequency, time, tone, _this.def.lowPassFrequencyRamp);
            }
            var gain_node = context.createGain();
            gain_node.gain.value = _this.def.gain;
            audio.connect(gain_node);
            audio = gain_node;
            var envelope = _this.Envelope(_this.def.attackTime, _this.def.decayTime, _this.def.sustainTime, _this.def.releaseTime, _this.def.attackPunchVolume);
            audio.connect(envelope);
            audio = envelope;
            if (_this.def.dutyCycleLength > 0) {
                var duty_cycle = _this.DutyCycle(_this.def.dutyCycleLength, _this.def.dutyCyclePct, time);
                audio.connect(duty_cycle);
                audio = duty_cycle;
            }
            var flange = null;
            if (_this.def.flangeDelayTime > 0) {
                flange = _this.Flange(_this.def.flangeDelayTime, _this.def.flangeFeedbackVolume, audio);
                flange.connect(audio);
            }
            if (_this.def.vibratoTime > 0) {
                var vibrato_gain = _this.Vibrato(SFXWeb.GET_OSC_FROM_STRING(_this.def.vibratoWave), _this.def.vibratoFrequency, _this.def.vibratoShiftTime * time, _this.def.vibratoTime * time);
                audio.connect(vibrato_gain);
                audio = vibrato_gain;
            }
            var master_volume_gain = context.createGain();
            master_volume_gain.gain.value = _this.masterVolume;
            audio.connect(master_volume_gain);
            master_volume_gain.connect(context.destination);
            tone.start();
            tone.stop(context.currentTime + time);
        };
        /*************************************************************/
        /* OscillatorTone creates the oscillator node that is the starting */
        /* point for all sounds not based on noise                   */
        /*************************************************************/
        this.OscillatorTone = function (frequency, wave) {
            var context = SFXWeb.ACTX;
            var tone = context.createOscillator();
            tone.type = wave;
            tone.frequency.setValueAtTime(frequency, context.currentTime); // value in hertz
            return tone;
        };
        /*************************************************************/
        /* DutyCycle creates a GainNode that drops the volume to 0   */
        /* in cycles                                                 */
        /*************************************************************/
        this.DutyCycle = function (cycle_length, cycle_pct, total_time) {
            var context = SFXWeb.ACTX;
            var t = 0;
            var start_mute = (1.0 - cycle_pct) * cycle_length;
            var duty_cycle_node = context.createGain();
            duty_cycle_node.gain.setValueAtTime(1, context.currentTime);
            while (t < total_time) {
                duty_cycle_node.gain.setValueAtTime(1, context.currentTime + t + start_mute * 0.98); // + start_mute
                duty_cycle_node.gain.linearRampToValueAtTime(0, context.currentTime + t + start_mute); // + start_mute
                duty_cycle_node.gain.setValueAtTime(0, context.currentTime + t + cycle_length * 0.98);
                duty_cycle_node.gain.linearRampToValueAtTime(1, context.currentTime + t + cycle_length);
                t += cycle_length; //cycle_length;
            }
            return duty_cycle_node;
        };
        /*************************************************************/
        /* HighPassFilter allows all frequencies above a certain     */
        /* value to pass and filters out all lower frequencies       */
        /*************************************************************/
        this.HighPassFilter = function (hpf_frequency, time, input_node) {
            var context = SFXWeb.ACTX;
            var highPassFilter = context.createBiquadFilter();
            highPassFilter.type = "highpass";
            highPassFilter.frequency.value = hpf_frequency;
            input_node.connect(highPassFilter);
            return highPassFilter;
        };
        /*************************************************************/
        /* LowPassFilter allows all frequencies below a certain      */
        /* value to pass and filters out all higher frequencies      */
        /*************************************************************/
        this.LowPassFilter = function (lpf_frequency, time, input_node, ramp_frequency) {
            if (ramp_frequency === void 0) { ramp_frequency = 0; }
            var context = SFXWeb.ACTX;
            var lowPassFilter = context.createBiquadFilter();
            lowPassFilter.type = "lowpass";
            lowPassFilter.frequency.value = lpf_frequency;
            if (ramp_frequency != 0) {
                lowPassFilter.frequency.linearRampToValueAtTime(ramp_frequency, context.currentTime + time);
            }
            input_node.connect(lowPassFilter);
            return lowPassFilter;
        };
        /*************************************************************/
        /* DelayedFrequencySlide waits a certain period of time and  */
        /* then slides the frequency of the oscilltor to a different */
        /* value                                                     */
        /*************************************************************/
        this.DelayedFrequencySlide = function (frequency, frequency_mult, delay_start, end_time, input_node) {
            var context = SFXWeb.ACTX;
            input_node.frequency.setValueAtTime(frequency, context.currentTime + delay_start);
            if (_this.def.slideType == 'linear') {
                input_node.frequency.linearRampToValueAtTime(frequency * frequency_mult, context.currentTime + end_time);
            }
            else if (_this.def.slideType == 'none') {
                input_node.frequency.setValueAtTime(frequency * frequency_mult, context.currentTime + delay_start);
            }
            else if (_this.def.slideType == 'exp') {
                input_node.frequency.exponentialRampToValueAtTime(frequency * frequency_mult, context.currentTime + end_time);
            }
            return input_node;
        };
        /*************************************************************/
        /* FrequencySlide creates an oscillator that slides it's     */
        /* frequency from one value to a different value over a      */
        /* period of time                                            */
        /*************************************************************/
        this.FrequencySlide = function (frequency, time, input_node) {
            var context = SFXWeb.ACTX;
            input_node.frequency.linearRampToValueAtTime(frequency, context.currentTime + time); // value in hertz
            return input_node;
        };
        /*************************************************************/
        /* Vibrato creates a GainNode that moves the volume up and   */
        /* down in a wave pattern                                    */
        /*************************************************************/
        this.Vibrato = function (wave_type, vibrato_frequency, shift_time, time) {
            var context = SFXWeb.ACTX;
            var gainNode = context.createGain();
            var osc = context.createOscillator();
            osc.type = wave_type;
            osc.frequency.setValueAtTime(vibrato_frequency, context.currentTime); // value in hertz
            osc.connect(gainNode);
            osc.start(context.currentTime + shift_time);
            osc.stop(context.currentTime + time);
            return gainNode; //input_node;
        };
        this.noiseData = new Float32Array(16384);
        this.noiseInit = false;
        /*************************************************************/
        /* Noise is an alternative starting point for a sound        */
        /* effects such as explosions                                */
        /*************************************************************/
        this.Noise = function () {
            var context = SFXWeb.ACTX;
            var noise_node = context.createBufferSource();
            var buffer = context.createBuffer(1, 16384, context.sampleRate);
            if (_this.noiseInit == false) {
                for (var i = 0; i < 16384; i += 10) {
                    _this.noiseData[i] = Math.random() * 2 - 1;
                    for (var j = 1; j < 10; j++) {
                        _this.noiseData[i + j] = _this.noiseData[i];
                    }
                }
            }
            var data = buffer.getChannelData(0);
            data.set(_this.noiseData);
            noise_node.buffer = buffer;
            noise_node.loop = true;
            return noise_node;
        };
        /*************************************************************/
        /* Envelope creates a GainNode that ramps up the volume and  */
        /* back down again when the effect is ending                 */
        /*************************************************************/
        this.Envelope = function (attack_time, decay_time, sustain_time, release_time, attack_punch) {
            var context = SFXWeb.ACTX;
            var envelope = context.createGain();
            envelope.gain.setValueAtTime(0.0, context.currentTime);
            envelope.gain.linearRampToValueAtTime(attack_punch, context.currentTime + attack_time);
            envelope.gain.linearRampToValueAtTime(1, context.currentTime + attack_time + decay_time);
            envelope.gain.setValueAtTime(1, context.currentTime + attack_time + decay_time + sustain_time);
            envelope.gain.linearRampToValueAtTime(0.0, context.currentTime + attack_time + decay_time + sustain_time + release_time);
            return envelope;
        };
        /*************************************************************/
        /* Flange is a feedback effect                               */
        /*************************************************************/
        this.Flange = function (delay_time, feedback_volume, input) {
            var context = SFXWeb.ACTX;
            var delayNode = context.createDelay();
            delayNode.delayTime.value = delay_time;
            var feedback = context.createGain();
            feedback.gain.value = feedback_volume;
            input.connect(delayNode);
            delayNode.connect(feedback);
            return feedback;
        };
        if (SFXWeb.SN != null) {
            return;
        }
        SFXWeb.SN = this;
        SFXWeb.ACTX = new AudioContext();
    }
    /*************************************************************/
    /* This static method converts a string to an OscillatorType */
    /*************************************************************/
    SFXWeb.GET_OSC_FROM_STRING = function (wave_type) {
        if (wave_type == 'square') {
            return 'square';
        }
        else if (wave_type == 'sine') {
            return 'sine';
        }
        else if (wave_type == 'triangle') {
            return 'triangle';
        }
        else if (wave_type == 'sawtooth') {
            return 'sawtooth';
        }
        return 'square';
    };
    SFXWeb.TWO_PI = Math.PI * 2;
    return SFXWeb;
}());