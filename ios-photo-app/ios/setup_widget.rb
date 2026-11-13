require 'xcodeproj'
require 'fileutils'

project_path = File.expand_path('App/App.xcodeproj', __dir__)
project = Xcodeproj::Project.open(project_path)

main_target = project.targets.find { |t| t.name == 'App' }
raise "Main target 'App' not found" unless main_target

widget_target = project.targets.find { |t| t.name == 'BackupWidget' }

if widget_target
  puts "BackupWidget target already exists. Skipping target creation."
else
  puts "Creating BackupWidget app_extension target..."
  widget_target = project.new_target(:app_extension, 'BackupWidget', :ios, '16.2')
  
  widget_target.build_configurations.each do |config|
    config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.diennguyen.cloudphotos.BackupWidget'
    config.build_settings['INFOPLIST_FILE'] = 'BackupWidget/Info.plist'
    config.build_settings['PRODUCT_NAME'] = 'BackupWidget'
    config.build_settings['SWIFT_VERSION'] = '5.0'
    config.build_settings['TARGETED_DEVICE_FAMILY'] = '1,2'
    config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '16.2'
    config.build_settings['ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES'] = 'YES'
    config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
    config.build_settings['CODE_SIGNING_REQUIRED'] = 'NO'
    config.build_settings['CODE_SIGN_IDENTITY'] = ''
    config.build_settings['CURRENT_PROJECT_VERSION'] = '12'
    config.build_settings['MARKETING_VERSION'] = '1.3'
  end

  # Group BackupWidget
  widget_group = project.main_group.find_subpath('BackupWidget', true)
  widget_group.set_source_tree('<group>')
  widget_group.path = 'BackupWidget'
  
  # File references
  widget_swift_ref = widget_group.find_file_by_path('BackupWidget.swift') || widget_group.new_file('BackupWidget.swift')
  widget_group.find_file_by_path('Info.plist') || widget_group.new_file('Info.plist')
  
  # Shared attributes
  app_group = project.main_group.find_subpath('App', true)
  attrs_ref = app_group.find_file_by_path('BackupActivityAttributes.swift') || app_group.new_file('BackupActivityAttributes.swift')

  # Add to widget target sources
  widget_target.source_build_phase.add_file_reference(widget_swift_ref)
  widget_target.source_build_phase.add_file_reference(attrs_ref)

  # Add dependency to main App target
  main_target.add_dependency(widget_target)

  # Embed Foundation Extensions build phase
  embed_phase = main_target.copy_files_build_phases.find { |bp| bp.name == 'Embed Foundation Extensions' }
  unless embed_phase
    embed_phase = main_target.new_copy_files_build_phase('Embed Foundation Extensions')
    embed_phase.symbol_dst_subfolder_spec = :plug_ins
    embed_phase.dst_path = ''
  end

  unless embed_phase.files_references.include?(widget_target.product_reference)
    build_file = embed_phase.add_file_reference(widget_target.product_reference)
    build_file.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
  end

  project.save
  puts "Successfully configured BackupWidget target in #{project_path}"
end
